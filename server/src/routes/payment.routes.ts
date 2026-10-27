import { Router } from 'express';
import { createHmac } from 'crypto';
import { z } from 'zod';
import { equalSecret, signVnp, settlePayment } from '../services/payment';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middlewares/auth';
import { sendSuccess, sendError } from '../utils/response';
const router=Router();
router.get('/events',authenticate,requireRole('admin'),async(_req,res)=>{
  try{const [events]=await pool.query('SELECT * FROM payment_events ORDER BY id DESC LIMIT 100');return sendSuccess(res,events);}
  catch(e:any){return sendError(res,e.message,500);}
});
router.post('/sepay/webhook',async(req,res)=>{
  const secret=process.env.SEPAY_WEBHOOK_SECRET;
  const key=process.env.SEPAY_WEBHOOK_API_KEY;
  if(!secret&&!key) return res.status(503).json({success:false,message:'Webhook chưa cấu hình'});
  if(secret) {
    const timestamp=req.get('X-SePay-Timestamp')||'';
    const raw=(req as any).rawBody as Buffer|undefined;
    const signature=req.get('X-SePay-Signature')||'';
    if(!raw||!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300||!equalSecret(signature,'sha256='+createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex'))) return res.status(401).json({success:false});
  } else if(!equalSecret(req.get('Authorization')||'','Apikey '+key)) return res.status(401).json({success:false});
  const parsed=z.object({id:z.union([z.number().int().positive(),z.string().min(1).max(100)]),accountNumber:z.string(),transferType:z.enum(['in','out']),transferAmount:z.number().int().positive().safe(),content:z.string(),code:z.string().nullable().optional()}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({success:false});
  const b=parsed.data;
  if(!process.env.BANK_ACCOUNT||b.accountNumber!==process.env.BANK_ACCOUNT) return res.status(400).json({success:false,message:'Sai tài khoản nhận'});
  if(b.transferType!=='in') return res.json({success:true,ignored:true});
  // Match exactly one full order reference; ambiguous transfers go to reconciliation.
  const references=[...new Set((b.content+' '+(b.code||'')).match(/\b(?:KF|POS)[A-Z0-9]+\b/g)||[])];
  try { return res.json({success:true,outcome:await settlePayment('sepay',String(b.id),references.length===1?references[0]:'',b.transferAmount)}); }
  catch { return res.status(500).json({success:false}); }
});
router.get('/vnpay/ipn',async(req,res)=>{
  const secret=process.env.VNPAY_HASH_SECRET;
  if(!secret) return res.status(503).json({RspCode:'99',Message:'Not configured'});
  const params=req.query;
  if(Object.values(params).some(v=>typeof v!=='string')) return res.json({RspCode:'97',Message:'Invalid parameters'});
  const p=params as Record<string,string>;
  if(!p.vnp_SecureHash||!equalSecret(signVnp(p,secret),p.vnp_SecureHash.toLowerCase())||p.vnp_TmnCode!==process.env.VNPAY_TMN_CODE) return res.json({RspCode:'97',Message:'Invalid signature'});
  if(!/^\d+$/.test(p.vnp_Amount)||!Number.isSafeInteger(Number(p.vnp_Amount))||Number(p.vnp_Amount)%100!==0||!p.vnp_TransactionNo||!p.vnp_TxnRef) return res.json({RspCode:'04',Message:'Invalid amount or reference'});
  if(p.vnp_ResponseCode!=='00'||p.vnp_TransactionStatus!=='00') return res.json({RspCode:'00',Message:'Unsuccessful payment acknowledged'});
  try {
    const outcome=await settlePayment('vnpay',p.vnp_TransactionNo,p.vnp_TxnRef,Number(p.vnp_Amount)/100);
    const code=outcome==='paid'?'00':outcome==='order_not_found'?'01':outcome==='amount_mismatch'?'04':outcome==='already_paid'||outcome==='already_received'?'02':'99';
    return res.json({RspCode:code,Message:outcome});
  } catch { return res.json({RspCode:'99',Message:'Retry later'}); }
});
// Browser redirect never changes payment state; only authenticated server-to-server IPN does.
router.get('/vnpay/return',(_req,res)=>res.json({success:true,message:'Đang đối soát thanh toán. Mở đơn hàng để xem trạng thái cập nhật.'}));
export default router;
