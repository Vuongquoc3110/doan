import { createHmac, timingSafeEqual } from 'crypto';
import pool from '../db/connection';
import { enqueueOrderEvents } from './operation-events';

export function equalSecret(a:string,b:string) { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length&&timingSafeEqual(x,y); }
export function vnpCanonical(params:Record<string,string>) {
  return Object.keys(params).filter(k=>k.startsWith('vnp_')&&!['vnp_SecureHash','vnp_SecureHashType'].includes(k)).sort()
    .map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g,'+')}`).join('&');
}
export function signVnp(params:Record<string,string>, secret:string) { return createHmac('sha512',secret).update(vnpCanonical(params)).digest('hex'); }
function vnpDate(date:Date) { return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date).replace(/\D/g,''); }
export function requirePaymentConfig(method:string) {
  if(method==='vietqr'&&(!process.env.BANK_BIN||!process.env.BANK_ACCOUNT||!process.env.SEPAY_WEBHOOK_SECRET&&!process.env.SEPAY_WEBHOOK_API_KEY)) throw new Error('VietQR chưa được cấu hình tài khoản và webhook');
  if(method==='vnpay'&&(!process.env.VNPAY_TMN_CODE||!process.env.VNPAY_HASH_SECRET||!process.env.VNPAY_RETURN_URL||!process.env.VNPAY_PAYMENT_URL)) throw new Error('VNPay chưa được cấu hình merchant');
}
export function paymentData(method:string,code:string,total:number,ip='127.0.0.1') {
  requirePaymentConfig(method);
  if(method==='vietqr') return {qrUrl:`https://img.vietqr.io/image/${encodeURIComponent(process.env.BANK_BIN!)}-${encodeURIComponent(process.env.BANK_ACCOUNT!)}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(process.env.BANK_ACCOUNT_NAME||'')}`,accountNumber:process.env.BANK_ACCOUNT,accountName:process.env.BANK_ACCOUNT_NAME,amount:total,memo:code};
  if(method==='vnpay') {
    const p:Record<string,string>={vnp_Version:'2.1.0',vnp_Command:'pay',vnp_TmnCode:process.env.VNPAY_TMN_CODE!,vnp_Amount:String(total*100),vnp_CreateDate:vnpDate(new Date()),vnp_ExpireDate:vnpDate(new Date(Date.now()+15*60000)),vnp_CurrCode:'VND',vnp_IpAddr:ip.replace('::ffff:',''),vnp_Locale:'vn',vnp_OrderInfo:'Thanh toan '+code,vnp_OrderType:'other',vnp_ReturnUrl:process.env.VNPAY_RETURN_URL!,vnp_TxnRef:code};
    return {vnpayUrl:process.env.VNPAY_PAYMENT_URL+'?'+vnpCanonical(p)+'&vnp_SecureHash='+signVnp(p,process.env.VNPAY_HASH_SECRET!)};
  }
  return null;
}
export async function settlePayment(provider:string,eventId:string,code:string,amount:number) {
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing]=await conn.query<any[]>('SELECT * FROM payment_events WHERE provider=? AND event_id=? FOR UPDATE',[provider,eventId]);
    if(existing.length) { await conn.rollback(); return existing[0].outcome; }
    const [orders]=await conn.query<any[]>('SELECT * FROM orders WHERE code=? FOR UPDATE',[code]);
    const order=orders[0];
    let outcome='order_not_found';
    if(order) {
      if(Number(order.total)!==amount) outcome='amount_mismatch';
      else if(order.payment_method!==(provider==='vnpay'?'vnpay':'vietqr')) outcome='method_mismatch';
      else if(order.payment_status==='paid') outcome='already_paid';
      else if(['CANCELLED','RETURNED','COMPLETED'].includes(order.status)) outcome='order_closed';
      else {
        await conn.execute(`UPDATE orders SET payment_status='paid',status=CASE WHEN status IN ('PENDING','CONFIRMED') THEN 'PREPARING' ELSE status END WHERE id=?`,[order.id]);
        const status=['PENDING','CONFIRMED'].includes(order.status)?'PREPARING':order.status;
        await conn.execute('INSERT INTO order_status_history (order_id,status,note) VALUES (?,?,?)',[order.id,status,'Đã xác thực thanh toán '+provider]);
        await enqueueOrderEvents(conn,{...order,payment_status:'paid',status},'payment:'+provider+':'+eventId);
        outcome='paid';
      }
    }
    await conn.execute('INSERT INTO payment_events (provider,event_id,order_id,amount,outcome) VALUES (?,?,?,?,?)',[provider,eventId,order?.id||null,amount,outcome]);
    await conn.commit(); return outcome;
  } catch(e:any) { await conn.rollback(); if(e.code==='ER_DUP_ENTRY') return 'already_received'; throw e; }
  finally { conn.release(); }
}
