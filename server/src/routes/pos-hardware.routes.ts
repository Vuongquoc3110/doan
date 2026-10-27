import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/connection';
import { authenticate, requireRole, attachStaffStore } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { sendSuccess, sendError } from '../utils/response';
import { printerForStore, receiptBytes, sendReceipt } from '../services/receipt';

const router = Router();
router.use(authenticate, requireRole('staff','admin'), attachStaffStore);
router.get('/variants/by-sku/:sku', async (req,res) => {
  try {
    const store = req.user!.role === 'admin' ? Number(req.query.store_id || 1) : req.user!.storeId;
    const [rows] = await pool.query<any[]>(`SELECT v.id as variant_id,v.product_id,v.sku,v.label as variant_label,v.price,p.name as product_name,COALESCE(i.qty,0) as qty
      FROM product_variants v JOIN products p ON p.id=v.product_id LEFT JOIN inventory i ON i.variant_id=v.id AND i.store_id=?
      WHERE v.sku=? AND p.status='active'`, [store, req.params.sku]);
    if (!rows.length) return sendError(res,'Không tìm thấy SKU đang bán',404);
    return sendSuccess(res,rows[0]);
  } catch (e:any) { return sendError(res,e.message,500); }
});
router.get('/orders/:id/receipt', async (req,res) => {
  try {
    const [orders] = await pool.query<any[]>('SELECT * FROM orders WHERE id=? AND delivery_type="pickup"',[req.params.id]);
    if (!orders.length) return sendError(res,'Không tìm thấy đơn tại quầy',404);
    if (req.user!.role === 'staff' && orders[0].store_id !== req.user!.storeId) return sendError(res,'Không thuộc chi nhánh của bạn',403);
    const [items] = await pool.query<any[]>('SELECT * FROM order_items WHERE order_id=?',[req.params.id]);
    return sendSuccess(res,{...orders[0],items});
  } catch(e:any) { return sendError(res,e.message,500); }
});
router.post('/orders/:id/print', validate(z.object({reprint:z.boolean().default(false)})), async (req,res) => {
  const conn = await pool.getConnection();
  let jobId: number | undefined;
  try {
    await conn.beginTransaction();
    const [orders] = await conn.query<any[]>('SELECT * FROM orders WHERE id=? AND delivery_type="pickup" FOR UPDATE',[req.params.id]);
    if (!orders.length) { await conn.rollback(); return sendError(res,'Không tìm thấy đơn tại quầy',404); }
    const order = orders[0];
    if (req.user!.role === 'staff' && order.store_id !== req.user!.storeId) { await conn.rollback(); return sendError(res,'Không thuộc chi nhánh của bạn',403); }
    const printer = printerForStore(order.store_id);
    const [existing] = await conn.query<any[]>('SELECT id,state FROM receipt_jobs WHERE order_id=? ORDER BY id DESC LIMIT 1',[order.id]);
    if (existing.length && (!req.body.reprint || existing[0].state === 'sending')) { await conn.rollback(); return sendError(res,'Đã gửi lệnh in. Kiểm tra máy in trước khi chọn in lại',409); }
    const [items] = await conn.query<any[]>('SELECT * FROM order_items WHERE order_id=?',[order.id]);
    const [result] = await conn.execute<any>('INSERT INTO receipt_jobs (order_id,user_id) VALUES (?,?)',[order.id,req.user!.userId]);
    jobId = result.insertId;
    await conn.commit();
    await sendReceipt(printer,receiptBytes(order,items,printer.width));
    await conn.execute('UPDATE receipt_jobs SET state="submitted" WHERE id=?',[jobId!]);
    return sendSuccess(res,{jobId,state:'submitted'},'Đã gửi dữ liệu tới máy in; vui lòng kiểm tra giấy in');
  } catch(e:any) {
    await conn.rollback();
    if (jobId) await conn.execute('UPDATE receipt_jobs SET state="unknown" WHERE id=?',[jobId]);
    return sendError(res,e.message,503);
  } finally { conn.release(); }
});
export default router;
