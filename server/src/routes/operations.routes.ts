import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/connection';
import { authenticate, requireRole, attachStaffStore } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { sendSuccess, sendError } from '../utils/response';
const router=Router();
router.post('/me/push-devices',authenticate,validate(z.object({token:z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[\w-]+\]$/),platform:z.enum(['android','ios'])})),async(req,res)=>{
  try { await pool.execute('INSERT INTO push_devices (token,user_id,platform) VALUES (?,?,?) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),platform=VALUES(platform)',[req.body.token,req.user!.userId,req.body.platform]); return sendSuccess(res,null); }
  catch(e:any) { return sendError(res,e.message,500); }
});
router.delete('/me/push-devices',authenticate,validate(z.object({token:z.string().min(1)})),async(req,res)=>{
  try { await pool.execute('DELETE FROM push_devices WHERE token=? AND user_id=?',[req.body.token,req.user!.userId]);return sendSuccess(res,null); }
  catch(e:any) { return sendError(res,e.message,500); }
});
router.get('/staff/inventory/batches',authenticate,requireRole('staff','admin'),attachStaffStore,async(req,res)=>{
  try {
    const store=req.user!.role==='admin'?Number(req.query.store_id||1):req.user!.storeId;
    const hours=req.query.hours===undefined?null:Number(req.query.hours);
    if(hours!==null&&(!Number.isFinite(hours)||hours<0||hours>168)) return sendError(res,'Khoảng cảnh báo không hợp lệ',400);
    const [rows]=await pool.query<any[]>(`SELECT b.*,p.name as product_name,v.label as variant_label,
      CASE WHEN b.expires_at IS NULL THEN 'unknown' WHEN b.expires_at<=NOW() THEN 'expired' WHEN b.expires_at<=DATE_ADD(NOW(),INTERVAL 48 HOUR) THEN 'expiring' ELSE 'fresh' END as expiry_status
      FROM inventory_batches b JOIN product_variants v ON v.id=b.variant_id JOIN products p ON p.id=v.product_id
      WHERE b.store_id=? AND b.qty>0 AND (? IS NULL OR b.expires_at<=DATE_ADD(NOW(), INTERVAL ? HOUR)) ORDER BY b.expires_at IS NULL,b.expires_at,b.received_at`,[store,hours,hours]);
    return sendSuccess(res,rows);
  } catch(e:any) { return sendError(res,e.message,500); }
});
router.put('/staff/inventory/batches/:id/expiry',authenticate,requireRole('staff','admin'),attachStaffStore,
  validate(z.object({expiresAt:z.string().datetime({offset:true}),note:z.string().min(3)})),async(req,res)=>{
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [batches]=await conn.query<any[]>('SELECT * FROM inventory_batches WHERE id=? FOR UPDATE',[req.params.id]);
    if(!batches.length) {await conn.rollback();return sendError(res,'Không tìm thấy lô',404);}
    const batch=batches[0];
    if(req.user!.role==='staff'&&batch.store_id!==req.user!.storeId) {await conn.rollback();return sendError(res,'Không thuộc chi nhánh',403);}
    if(batch.expires_at&&!batch.legacy) {await conn.rollback();return sendError(res,'Chỉ bổ sung hạn dùng cho lô lịch sử chưa xác minh',409);}
    await conn.execute('UPDATE inventory_batches SET expires_at=?,legacy=0 WHERE id=?',[new Date(req.body.expiresAt),batch.id]);
    await conn.execute('INSERT INTO audit_logs (user_id,action,entity,entity_id,details) VALUES (?,"VERIFY_BATCH_EXPIRY","inventory_batches",?,?)',[req.user!.userId,batch.id,JSON.stringify(req.body)]);
    await conn.commit();return sendSuccess(res,null);
  }catch(e:any){await conn.rollback();return sendError(res,e.message,500);}finally{conn.release();}
});
router.get('/admin/operations/jobs',authenticate,requireRole('admin'),async(_req,res)=>{
  try { const [rows]=await pool.query('SELECT id,kind,state,attempts,available_at,last_error FROM operation_jobs ORDER BY id DESC LIMIT 100'); return sendSuccess(res,rows); }
  catch(e:any){return sendError(res,e.message,500);}
});
// Purchase verification is attached to a particular completed order, not an editable boolean.
router.post('/me/reviews',authenticate,requireRole('customer'),validate(z.object({orderId:z.number().int().positive(),productId:z.number().int().positive(),rating:z.number().int().min(1).max(5),comment:z.string().trim().min(3).max(3000)})),async(req,res)=>{
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b=req.body;
    const [orders]=await conn.query<any[]>('SELECT id FROM orders WHERE id=? AND user_id=? AND status="COMPLETED" FOR UPDATE',[b.orderId,req.user!.userId]);
    const [items]=await conn.query<any[]>('SELECT oi.id FROM order_items oi JOIN product_variants v ON v.id=oi.variant_id WHERE oi.order_id=? AND v.product_id=? LIMIT 1',[b.orderId,b.productId]);
    if(!orders.length||!items.length){await conn.rollback();return sendError(res,'Chỉ được đánh giá sản phẩm trong đơn đã mua và hoàn tất',403);}
    const [existing]=await conn.query<any[]>('SELECT review_id FROM verified_reviews WHERE user_id=? AND product_id=? AND order_id=?',[req.user!.userId,b.productId,b.orderId]);
    if(existing.length){await conn.rollback();return sendError(res,'Bạn đã đánh giá sản phẩm trong đơn này',409);}
    const [result]=await conn.execute<any>('INSERT INTO reviews (product_id,user_id,rating,comment,status) VALUES (?,?,?,?,"pending")',[b.productId,req.user!.userId,b.rating,b.comment]);
    await conn.execute('INSERT INTO verified_reviews (review_id,order_id,user_id,product_id) VALUES (?,?,?,?)',[result.insertId,b.orderId,req.user!.userId,b.productId]);
    await conn.commit();return sendSuccess(res,{reviewId:result.insertId,verifiedBuyer:true,status:'pending'},'Đã gửi đánh giá để duyệt',201);
  }catch(e:any){await conn.rollback();return sendError(res,e.message,500);}finally{conn.release();}
});
export default router;
