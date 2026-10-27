import pool from '../db/connection';
import { dispatchOrder } from './logistics';
const messages:Record<string,string>={PENDING:'Đơn hàng đã được tiếp nhận',CONFIRMED:'Đơn hàng đã được xác nhận',PREPARING:'Đơn hàng đang được chuẩn bị',READY:'Đơn hàng đã sẵn sàng giao',SHIPPING:'Đơn hàng đang giao tới bạn',COMPLETED:'Đơn hàng đã hoàn tất',CANCELLED:'Đơn hàng đã hủy',RETURNED:'Yêu cầu đổi trả đã được xử lý'};
async function push(payload:any) {
  if(process.env.EXPO_PUSH_ENABLED!=='true') throw new Error('Expo Push chưa kích hoạt');
  const [devices]=await pool.query<any[]>('SELECT token FROM push_devices WHERE user_id=?',[payload.userId]);
  for(const device of devices) {
    const r=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json',...(process.env.EXPO_ACCESS_TOKEN?{Authorization:'Bearer '+process.env.EXPO_ACCESS_TOKEN}:{})},body:JSON.stringify({to:device.token,sound:'default',channelId:'orders',title:'VQ FRUIT · '+payload.code,body:payload.body||messages[payload.status]||payload.status,data:{orderId:payload.orderId,batchId:payload.batchId}}),signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error('Expo HTTP '+r.status);
    const result:any=await r.json();
    if(result.data?.status==='error') {
      if(result.data.details?.error==='DeviceNotRegistered') await pool.execute('DELETE FROM push_devices WHERE token=?',[device.token]);
      else throw new Error('Expo từ chối thông báo');
    } else if(result.data?.id) {
      await pool.execute('INSERT IGNORE INTO operation_jobs (kind,dedupe_key,payload,available_at) VALUES ("push_receipt",?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE))',[result.data.id,JSON.stringify({ticket:result.data.id,token:device.token})]);
    } else throw new Error('Expo không trả mã thông báo');
  }
}
export async function runOperationJobs() {
  const conn=await pool.getConnection();let job:any;
  try {
    await conn.beginTransaction();
    const [jobs]=await conn.query<any[]>(`SELECT * FROM operation_jobs WHERE state IN ('pending','retry') AND available_at<=NOW()
      AND (kind<>'dispatch' OR ?='true') AND (kind NOT IN ('push','push_receipt') OR ?='true') AND (kind<>'zns' OR ?='true') ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`,[process.env.AHAMOVE_ENABLED||'false',process.env.EXPO_PUSH_ENABLED||'false',process.env.ZNS_ENABLED||'false']);
    job=jobs[0];
    if(!job){await conn.rollback();return;}
    await conn.execute('UPDATE operation_jobs SET state="processing",attempts=attempts+1,locked_at=NOW() WHERE id=?',[job.id]);await conn.commit();
    const payload=typeof job.payload==='string'?JSON.parse(job.payload):job.payload;
    if(job.kind==='dispatch') await dispatchOrder(payload.orderId);
    else if(job.kind==='push') await push(payload);
    else if(job.kind==='zns') {
      if(!process.env.ZNS_ACCESS_TOKEN||!process.env.PUBLIC_ORDER_BASE_URL) throw new Error('ZNS chưa cấu hình OA và link tra cứu');
      const template=JSON.parse(process.env.ZNS_STATUS_TEMPLATE_MAP||'{}')[payload.status];
      if(!template)throw new Error('Chưa có template ZNS được duyệt cho trạng thái này');
      const r=await fetch('https://business.openapi.zalo.me/message/template',{method:'POST',headers:{'Content-Type':'application/json',access_token:process.env.ZNS_ACCESS_TOKEN},body:JSON.stringify({phone:String(payload.phone).replace(/^0/,'84'),template_id:template,tracking_id:'order-'+payload.orderId+'-'+payload.status,template_data:{order_code:payload.code,status:messages[payload.status]||payload.status,tracking_url:process.env.PUBLIC_ORDER_BASE_URL.replace(/\/$/,'')+'/'+encodeURIComponent(payload.code)}}),signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw new Error('ZNS HTTP '+r.status);
      const result:any=await r.json();if(result.error!==0)throw new Error('ZNS từ chối template hoặc tài khoản');
    }
    else if(job.kind==='push_receipt') {
      const r=await fetch('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers:{'Content-Type':'application/json',...(process.env.EXPO_ACCESS_TOKEN?{Authorization:'Bearer '+process.env.EXPO_ACCESS_TOKEN}:{})},body:JSON.stringify({ids:[payload.ticket]}),signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw new Error('Expo receipt HTTP '+r.status);
      const result:any=await r.json();const receipt=result.data?.[payload.ticket];
      if(!receipt)throw new Error('Expo chưa có biên nhận');
      if(receipt.details?.error==='DeviceNotRegistered') await pool.execute('DELETE FROM push_devices WHERE token=?',[payload.token]);
      else if(receipt.status==='error')throw new Error('Expo delivery error');
    }
    await conn.execute('UPDATE operation_jobs SET state="done",last_error=NULL WHERE id=?',[job.id]);
  }catch(e:any){
    await conn.rollback();
    if(job)await conn.execute('UPDATE operation_jobs SET state=?,last_error=?,available_at=DATE_ADD(NOW(),INTERVAL ? SECOND) WHERE id=?',[job.attempts>=7?'failed':'retry',String(e.message).slice(0,500),Math.min(3600,30*2**job.attempts),job.id]);
    else throw e;
  }finally{conn.release();}
}
export function startOperationsWorker() {
  if(process.env.OPERATIONS_WORKER_ENABLED!=='true')return()=>{};
  let running=false,lastBatchScan=0;
  const timer=setInterval(async()=>{
    if(running)return;running=true;
    try {
      // Recover interrupted jobs. Dispatch re-entry reconciles instead of creating a second shipment.
      await pool.execute('UPDATE operation_jobs SET state="retry" WHERE state="processing" AND locked_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE)');
      if(Date.now()-lastBatchScan>60000){
        const [batches]=await pool.query<any[]>(`SELECT b.id,b.expires_at,b.qty,p.name,sp.user_id,
          CASE WHEN b.expires_at<=NOW() THEN 0 WHEN b.expires_at<=DATE_ADD(NOW(),INTERVAL 24 HOUR) THEN 24 ELSE 48 END as threshold
          FROM inventory_batches b JOIN product_variants v ON v.id=b.variant_id JOIN products p ON p.id=v.product_id JOIN staff_profiles sp ON sp.store_id=b.store_id
          WHERE b.qty>0 AND b.expires_at<=DATE_ADD(NOW(),INTERVAL 48 HOUR)`);
        for(const batch of batches)await pool.execute('INSERT IGNORE INTO operation_jobs (kind,dedupe_key,payload) VALUES ("push",?,?)',[`batch:${batch.id}:${new Date(batch.expires_at).getTime()}:${batch.threshold}:${batch.user_id}`,JSON.stringify({batchId:batch.id,userId:batch.user_id,code:'Cảnh báo lô hàng',body:`${batch.name}: ${batch.qty} phần ${batch.threshold===0?'đã hết hạn':`còn dưới ${batch.threshold} giờ hạn dùng`}. Kiểm tra kho chi nhánh.`})]);
        lastBatchScan=Date.now();
      }
      await runOperationJobs();
    }catch(e:any){console.error('Operations worker:',e.message);}finally{running=false;}
  },5000);timer.unref();return()=>clearInterval(timer);
}
