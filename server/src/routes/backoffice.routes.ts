import { Router } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import pool from '../db/connection';
import { authenticate,requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { sendSuccess,sendError } from '../utils/response';

const router=Router();router.use(authenticate,requireRole('admin'));
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>Number.isFinite(Date.parse(s))&&new Date(s).toISOString().startsWith(s),'Ngày không hợp lệ');
function range(query:any){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const to=date.parse(query.to||today),from=date.parse(query.from||new Date(Date.parse(to)-13*86400000).toISOString().slice(0,10));
  const days=(Date.parse(to)-Date.parse(from))/86400000;
  if(days<0||days>365)throw new Error('Khoảng ngày phải từ 1 đến 366 ngày');
  return {from,to};
}
async function report(query:any){
  const {from,to}=range(query),params=[from,to];
  const [daily]=await pool.query<any[]>('SELECT DATE(created_at) as report_date,COUNT(*) as completed_orders,SUM(total) as daily_revenue FROM orders WHERE status="COMPLETED" AND created_at>=? AND created_at<DATE_ADD(?,INTERVAL 1 DAY) GROUP BY DATE(created_at) ORDER BY report_date',params);
  const [stores]=await pool.query<any[]>('SELECT s.id,s.name as store_name,COUNT(o.id) as completed_orders,COALESCE(SUM(o.total),0) as total_revenue FROM stores s LEFT JOIN orders o ON o.store_id=s.id AND o.status="COMPLETED" AND o.created_at>=? AND o.created_at<DATE_ADD(?,INTERVAL 1 DAY) GROUP BY s.id ORDER BY total_revenue DESC,s.id LIMIT 5',params);
  const [topProducts]=await pool.query<any[]>('SELECT oi.product_name,SUM(oi.qty) as total_qty,SUM(oi.total_price) as total_sales FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status="COMPLETED" AND o.created_at>=? AND o.created_at<DATE_ADD(?,INTERVAL 1 DAY) GROUP BY oi.product_name ORDER BY total_qty DESC,total_sales DESC LIMIT 5',params);
  const [statusStats]=await pool.query<any[]>('SELECT status,COUNT(*) as count,SUM(total) as total_amount FROM orders WHERE created_at>=? AND created_at<DATE_ADD(?,INTERVAL 1 DAY) GROUP BY status',params);
  const [counts]=await pool.query<any[]>('SELECT (SELECT COUNT(*) FROM users WHERE role="customer") as customers,(SELECT COUNT(*) FROM products) as products,(SELECT COUNT(*) FROM return_requests WHERE status="pending") as returns_pending');
  const revenue=daily.reduce((n,d)=>n+Number(d.daily_revenue),0),completed=daily.reduce((n,d)=>n+Number(d.completed_orders),0);
  const days=Array.from({length:(Date.parse(to)-Date.parse(from))/86400000+1},(_,i)=>new Date(Date.parse(from)+i*86400000).toISOString().slice(0,10));
  const totals=new Map(daily.map(d=>[new Date(d.report_date).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),Number(d.daily_revenue)]));
  return {range:{from,to},total_revenue:revenue,total_orders:completed,total_customers:counts[0].customers,total_products:counts[0].products,pending_returns:counts[0].returns_pending,
    summary:{totalRevenue:revenue,totalCompletedOrders:completed,totalCustomers:counts[0].customers,totalProducts:counts[0].products,pendingReturns:counts[0].returns_pending},
    revenue_chart:{labels:days.map(d=>d.slice(8)+'/'+d.slice(5,7)),data:days.map(d=>totals.get(d)||0)},top_stores:stores.map(s=>({name:s.store_name,revenue:Number(s.total_revenue),orders:s.completed_orders})),topProducts,statusStats,dailyRevenue:daily,storeRevenue:stores};
}
router.get(['/dashboard','/analytics/dashboard'],async(req,res)=>{
  try{return sendSuccess(res,await report(req.query));}catch(e:any){return sendError(res,e.message,e instanceof z.ZodError?400:e.message.startsWith('Khoảng')?400:500);}
});
router.get('/analytics/export',async(req,res)=>{
  try{
    const data=await report(req.query);
    const [rows]=await pool.query<any[]>('SELECT o.*,s.name as store_name FROM orders o JOIN stores s ON s.id=o.store_id WHERE o.created_at>=? AND o.created_at<DATE_ADD(?,INTERVAL 1 DAY) ORDER BY o.id LIMIT 10001',[data.range.from,data.range.to]);
    if(rows.length>10000)return sendError(res,'Khoảng ngày có hơn 10.000 đơn. Chọn khoảng nhỏ hơn để xuất đầy đủ.',400);
    const workbook=new ExcelJS.Workbook();workbook.creator='VQ FRUIT';
    const sheet=workbook.addWorksheet('Don hang');sheet.columns=[{header:'Mã đơn',key:'code',width:25},{header:'Chi nhánh',key:'store_name',width:35},{header:'Người nhận',key:'receiver_name',width:30},{header:'Ngày tạo',key:'created',width:24},{header:'Trạng thái',key:'status',width:18},{header:'Tổng tiền (VND)',key:'total',width:22},{header:'Thanh toán',key:'payment_status',width:18},{header:'VAT',key:'vat',width:50}];
    rows.forEach(row=>sheet.addRow({...row,total:Number(row.total),created:new Date(row.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),vat:typeof row.vat_request==='string'?row.vat_request:JSON.stringify(row.vat_request||{})}));
    sheet.getColumn('total').numFmt='#,##0';sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF183E32'}};sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:'H1'};
    const summary=workbook.addWorksheet('Tong hop');summary.addRows([['Từ ngày',data.range.from],['Đến ngày',data.range.to],['Doanh thu hoàn tất',data.total_revenue],['Đơn hoàn tất',data.total_orders],[],['Chi nhánh','Doanh thu hoàn tất']]);data.top_stores.forEach(s=>summary.addRow([s.name,s.revenue]));summary.columns=[{width:45},{width:25}];
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition',`attachment; filename="VQ_FRUIT_${data.range.from}_${data.range.to}.xlsx"`);
    return res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
  }catch(e:any){return sendError(res,e.message,e instanceof z.ZodError||e.message.startsWith('Khoảng')?400:500);}
});
router.get('/orders/:id',async(req,res)=>{
  try{
    const [orders]=await pool.query<any[]>('SELECT o.*,s.name as store_name FROM orders o LEFT JOIN stores s ON s.id=o.store_id WHERE o.id=?',[req.params.id]);
    if(!orders.length)return sendError(res,'Không tìm thấy đơn hàng',404);
    const [items]=await pool.query<any[]>('SELECT * FROM order_items WHERE order_id=?',[req.params.id]);
    const [history]=await pool.query<any[]>('SELECT * FROM order_status_history WHERE order_id=? ORDER BY id',[req.params.id]);
    const order=orders[0];return sendSuccess(res,{...order,vat_request:typeof order.vat_request==='string'?JSON.parse(order.vat_request):order.vat_request,items,history});
  }catch(e:any){return sendError(res,e.message,500);}
});
router.get('/products/:id',async(req,res)=>{
  try{const [products]=await pool.query<any[]>('SELECT * FROM products WHERE id=?',[req.params.id]);if(!products.length)return sendError(res,'Không có sản phẩm',404);const [variants]=await pool.query('SELECT * FROM product_variants WHERE product_id=? ORDER BY id',[req.params.id]);const [images]=await pool.query('SELECT * FROM product_images WHERE product_id=? ORDER BY sort,id',[req.params.id]);return sendSuccess(res,{...products[0],variants,images});}catch(e:any){return sendError(res,e.message,500);}
});
router.put('/products/:productId/variants/:id',validate(z.object({price:z.number().int().positive().safe(),label:z.string().trim().min(1).max(100).optional(),sku:z.string().trim().min(1).max(50).optional()})),async(req,res)=>{
  const conn=await pool.getConnection();
  try{await conn.beginTransaction();const [products]=await conn.query<any[]>('SELECT id FROM products WHERE id=? FOR UPDATE',[req.params.productId]);if(!products.length){await conn.rollback();return sendError(res,'Không có sản phẩm',404);}const [variants]=await conn.query<any[]>('SELECT id FROM product_variants WHERE id=? AND product_id=?',[req.params.id,req.params.productId]);if(!variants.length){await conn.rollback();return sendError(res,'Không có biến thể của sản phẩm này',404);}
    await conn.execute('UPDATE product_variants SET price=?,label=COALESCE(?,label),sku=COALESCE(?,sku) WHERE id=?',[req.body.price,req.body.label??null,req.body.sku??null,req.params.id]);
    await conn.execute('UPDATE products SET base_price=(SELECT MIN(price) FROM product_variants WHERE product_id=?) WHERE id=?',[req.params.productId,req.params.productId]);await conn.commit();return sendSuccess(res,null,'Đã cập nhật biến thể');
  }catch(e:any){await conn.rollback();return sendError(res,e.code==='ER_DUP_ENTRY'?'SKU đã tồn tại':e.message,e.code==='ER_DUP_ENTRY'?409:500);}finally{conn.release();}
});
router.get(['/inventory','/inventory/overview'],async(req,res)=>{
  const store=req.query.store_id===undefined?null:Number(req.query.store_id),search=typeof req.query.search==='string'?'%'+req.query.search.trim()+'%':'%';
  if(store!==null&&(!Number.isInteger(store)||store<1))return sendError(res,'Chi nhánh không hợp lệ',400);
  const page=Math.max(1,parseInt(String(req.query.page))||1),limit=Math.max(1,Math.min(500,parseInt(String(req.query.limit))||100));
  try{const filter='FROM inventory i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id JOIN stores s ON s.id=i.store_id WHERE (? IS NULL OR i.store_id=?) AND (p.name LIKE ? OR v.sku LIKE ?)';
    const params=[store,store,search,search];const [counts]=await pool.query<any[]>('SELECT COUNT(*) as total '+filter,params);
    const [rows]=await pool.query(`SELECT CONCAT(i.store_id,'-',i.variant_id) as id,i.store_id,i.variant_id,i.qty as quantity,v.label as variant_name,v.price,v.sku,p.name as product_name,s.name as store_name ${filter} ORDER BY i.qty,p.name,i.store_id,i.variant_id LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
    return sendSuccess(res,rows,'Danh sách tồn kho',200,{page,limit,total:Number(counts[0].total),totalPages:Math.ceil(Number(counts[0].total)/limit)});
  }catch(e:any){return sendError(res,e.message,500);}
});
const image=z.string().max(255).refine(value=>value.startsWith('/uploads/')||/^https:\/\//.test(value),'Ảnh phải là tệp đã tải lên hoặc URL HTTPS');
router.post('/products',validate(z.object({name:z.string().trim().min(2).max(200),slug:z.string().regex(/^[a-z0-9-]+$/).optional(),description:z.string().max(10000).default(''),origin:z.string().trim().min(1).max(100),base_price:z.number().int().positive().safe(),category_id:z.number().int().positive(),is_gift:z.boolean().default(false),status:z.enum(['active','inactive']).default('active'),images:z.array(image).min(1).max(10),variants:z.array(z.object({label:z.string().trim().min(1).max(100),price:z.number().int().positive().safe(),sku:z.string().trim().min(1).max(50),initialStock:z.literal(0).optional()})).min(1).max(20)})),(req,_res,next)=>{
  if(!req.body.slug)req.body.slug=req.body.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  next();
});
const banner=z.object({title:z.string().trim().min(1).max(150),subtitle:z.string().max(255).nullable().optional(),image_url:image,image_web:image.nullable().optional(),image_mobile:image.nullable().optional(),placement:z.enum(['home_hero','home_mid','category_top']).default('home_hero'),platform:z.enum(['all','web','mobile']).default('all'),link_url:z.string().max(255).refine(s=>!s||s.startsWith('/')||/^https:\/\//.test(s),'Liên kết không hợp lệ').default(''),link_type:z.enum(['url','product','collection','article']).default('url'),link_value:z.string().max(255).nullable().optional(),cta_label:z.string().max(100).default('Khám phá'),sort:z.number().int().min(0).default(0),is_active:z.boolean().default(true),start_at:z.string().datetime({offset:true}).nullable().optional(),end_at:z.string().datetime({offset:true}).nullable().optional(),countdown_at:z.string().datetime({offset:true}).nullable().optional()}).refine(b=>!b.start_at||!b.end_at||Date.parse(b.end_at)>Date.parse(b.start_at),'Ngày kết thúc phải sau ngày bắt đầu');
router.get('/banners',async(_req,res)=>{try{const [rows]=await pool.query('SELECT * FROM banners ORDER BY sort,id');return sendSuccess(res,rows);}catch(e:any){return sendError(res,e.message,500);}});
router.post('/banners',validate(banner),async(req,res)=>{
  try{const b=req.body;const keys=Object.keys(b);const values=keys.map(k=>k.endsWith('_at')&&b[k]?new Date(b[k]):b[k]??null);const [result]=await pool.query<any>('INSERT INTO banners ('+keys.map(k=>'`'+k+'`').join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')',values);return sendSuccess(res,{id:result.insertId},'Đã tạo banner',201);}catch(e:any){return sendError(res,e.message,500);}
});
router.put('/banners/:id',validate(banner),async(req,res)=>{
  try{const b=req.body;const keys=Object.keys(b);const values=keys.map(k=>k.endsWith('_at')&&b[k]?new Date(b[k]):b[k]??null);const [r]=await pool.query<any>('UPDATE banners SET '+keys.map(k=>'`'+k+'`=?').join(',')+' WHERE id=?',[...values,req.params.id]);if(!r.affectedRows)return sendError(res,'Không có banner',404);return sendSuccess(res,null,'Đã lưu banner');}catch(e:any){return sendError(res,e.message,500);}
});
router.put('/banners/:id/status',validate(z.object({is_active:z.boolean()})),async(req,res)=>{try{const [r]=await pool.execute<any>('UPDATE banners SET is_active=? WHERE id=?',[req.body.is_active,req.params.id]);if(!r.affectedRows)return sendError(res,'Không có banner',404);return sendSuccess(res,null);}catch(e:any){return sendError(res,e.message,500);}});
export default router;
