import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import pool from '../db/connection';
import { validate } from '../middlewares/validate';
import { sendError, sendSuccess } from '../utils/response';
import { ahamove, deliveryPath } from '../services/logistics';
import { equalSecret } from '../services/payment';
import { enqueueOrderEvents } from '../services/operation-events';
const router=Router();
router.post('/delivery/ahamove/webhook',async(req,res)=>{
  const secret=process.env.AHAMOVE_CALLBACK_SECRET;
  if(!secret)return sendError(res,'Callback chưa cấu hình',503);
  if(!equalSecret(req.get('apikey')||'',secret))return sendError(res,'Callback không hợp lệ',401);
  if(typeof req.body?._id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(req.body._id))return sendError(res,'Thiếu mã vận đơn',400);
  const conn=await pool.getConnection();
  try{
    const [shipments]=await conn.query<any[]>('SELECT * FROM shipments WHERE provider="ahamove" AND provider_id=?',[req.body._id]);
    if(!shipments.length)return sendError(res,'Không tìm thấy vận đơn',404);
    // Obtain authoritative status from the provider, not a browser-supplied status.
    const detail=await ahamove('/orders/'+encodeURIComponent(req.body._id));
    const status=detail.status||detail.order?.status;
    if(typeof status!=='string')throw new Error('Không nhận được trạng thái vận đơn');
    await conn.beginTransaction();
    const [orders]=await conn.query<any[]>('SELECT * FROM orders WHERE id=? FOR UPDATE',[shipments[0].order_id]);const order=orders[0];
    await conn.execute('UPDATE shipments SET state=? WHERE order_id=?',[status,order.id]);
    const next=status==='COMPLETED'?'COMPLETED':['IN PROCESS','IN_PROCESS','PICKED_UP'].includes(status)?'SHIPPING':null;
    if(next&&['READY','SHIPPING'].includes(order.status)&&order.status!==next){
      if(next==='COMPLETED'&&order.payment_method!=='cod'&&order.payment_status!=='paid')throw new Error('Cần đối soát thanh toán điện tử');
      await conn.execute('UPDATE orders SET status=?,payment_status=CASE WHEN ?="COMPLETED" THEN "paid" ELSE payment_status END WHERE id=?',[next,next,order.id]);
      await conn.execute('INSERT INTO order_status_history (order_id,status,note) VALUES (?,?,"Cập nhật xác thực từ Ahamove")',[order.id,next]);
      if(next==='COMPLETED'&&order.user_id){
        const earned=Math.floor(Number(order.total)*0.05/1000);
        if(earned>0){await conn.execute('UPDATE customer_profiles SET points=points+? WHERE user_id=?',[earned,order.user_id]);await conn.execute('INSERT INTO loyalty_transactions (user_id,order_id,points,type,description) VALUES (?,?,?,"earn","Hoàn tất giao Ahamove")',[order.user_id,order.id,earned]);}
      }
      await enqueueOrderEvents(conn,{...order,status:next},'delivery:'+order.id+':'+next);
    }
    await conn.commit();return sendSuccess(res,null);
  }catch(e:any){await conn.rollback();return sendError(res,e.message,503);}finally{conn.release();}
});
router.get('/capabilities',(_req,res)=>sendSuccess(res,{deliveryProvider:process.env.AHAMOVE_ENABLED==='true'&&process.env.AHAMOVE_TOKEN&&process.env.AHAMOVE_BASE_URL?'ahamove':'internal',vietqr:Boolean(process.env.BANK_BIN&&process.env.BANK_ACCOUNT&&(process.env.SEPAY_WEBHOOK_API_KEY||process.env.SEPAY_WEBHOOK_SECRET)),vnpay:Boolean(process.env.VNPAY_HASH_SECRET&&process.env.VNPAY_TMN_CODE&&process.env.VNPAY_PAYMENT_URL&&process.env.VNPAY_RETURN_URL)}));
router.post('/delivery/quote',validate(z.object({storeId:z.number().int().positive(),address:z.string().trim().min(10).max(500),lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),receiverName:z.string().min(2),receiverPhone:z.string().min(9)})),async(req,res)=>{
  try {
    const [stores]=await pool.query<any[]>('SELECT * FROM stores WHERE id=? AND is_active=1',[req.body.storeId]);
    if(!stores.length)return sendError(res,'Không tìm thấy chi nhánh đang hoạt động',404);
    const estimates=await ahamove('/orders/estimates',{order_time:0,path:deliveryPath(stores[0],{...req.body,name:req.body.receiverName,phone:req.body.receiverPhone}),group_services:[{_id:process.env.AHAMOVE_GROUP_SERVICE||'BIKE',group_requests:[]}],payment_method:'BALANCE'});
    const estimate=Array.isArray(estimates)?estimates.find(e=>e.data?.total_fee!==undefined):null;
    const fee=Number(estimate?.data?.total_fee);
    if(!Number.isSafeInteger(fee)||fee<0)throw new Error('Không nhận được báo giá hợp lệ');
    const id=randomUUID();
    await pool.execute('INSERT INTO delivery_quotes (id,store_id,address,lat,lng,fee,provider,expires_at) VALUES (?,?,?,?,?,?,"ahamove",DATE_ADD(NOW(),INTERVAL 5 MINUTE))',[id,req.body.storeId,req.body.address,req.body.lat,req.body.lng,fee]);
    return sendSuccess(res,{quoteId:id,fee,distanceKm:estimate.data.distance,expiresInSeconds:300});
  }catch(e:any){return sendError(res,e.message,503);}
});
export default router;
