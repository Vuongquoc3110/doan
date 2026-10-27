import { Request, Response } from 'express';
import pool from '../db/connection';
import { sendError, sendSuccess } from './response';
import { enqueueOrderEvents } from '../services/operation-events';

export async function decideReturn(req: Request, res: Response) {
  const b = req.body || {};
  const raw = b.status ?? (req.path.endsWith('/approve-refund') ? 'approved' : undefined);
  const status = ['approved_exchange', 'approved_refund'].includes(raw) ? 'approved' : raw;
  const resolution = raw === 'approved_exchange' ? 'exchange' : b.resolution ?? 'refund';
  const note = b.note ?? b.resolution_note ?? '';
  if(status==='rejected'&&(typeof note!=='string'||note.trim().length<3))return sendError(res,'Cần ghi lý do từ chối ít nhất 3 ký tự',400);
  if (!/^\d+$/.test(req.params.id) || !['approved', 'rejected'].includes(status) || !['exchange', 'refund'].includes(resolution) || typeof note !== 'string') {
    return sendError(res, 'Quyết định đổi trả không hợp lệ', 400);
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>(
      'SELECT rr.*, o.store_id, o.status as order_status FROM return_requests rr JOIN orders o ON o.id = rr.order_id WHERE rr.id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) { await conn.rollback(); return sendError(res, 'Yêu cầu đổi trả không tồn tại', 404); }
    const request = rows[0];
    if (req.user?.role === 'staff' && request.store_id !== req.user.storeId) {
      await conn.rollback(); return sendError(res, 'Không được xử lý yêu cầu của chi nhánh khác', 403);
    }
    if (request.status !== 'pending' || request.order_status !== 'COMPLETED') {
      await conn.rollback(); return sendError(res, 'Yêu cầu đã được xử lý hoặc đơn hàng không thể đổi trả', 409);
    }
    const decisionNote = `${status === 'approved' ? (resolution === 'exchange' ? 'Đổi hàng' : 'Hoàn tiền') : 'Từ chối'}: ${note}`;
    await conn.execute('UPDATE return_requests SET status = ?, decided_by = ?, decision_note = ? WHERE id = ?', [status, req.user!.userId, decisionNote, request.id]);
    if (status === 'approved') {
      await conn.execute("UPDATE orders SET status = 'RETURNED', payment_status = CASE WHEN ? = 'refund' THEN 'refunded' ELSE payment_status END WHERE id = ?", [resolution, request.order_id]);
      await conn.execute('INSERT INTO order_status_history (order_id, status, note, by_user_id) VALUES (?, "RETURNED", ?, ?)', [request.order_id, decisionNote, req.user!.userId]);
      const [orders]=await conn.query<any[]>('SELECT * FROM orders WHERE id=?',[request.order_id]);
      await enqueueOrderEvents(conn,orders[0],'return:'+request.id);
    }
    await conn.commit();
    return sendSuccess(res, { status, resolution, decision_note: decisionNote }, 'Đã xử lý yêu cầu đổi trả');
  } catch (err: any) {
    await conn.rollback(); return sendError(res, err.message, 500);
  } finally { conn.release(); }
}
