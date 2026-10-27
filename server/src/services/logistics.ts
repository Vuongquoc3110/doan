import pool from '../db/connection';
export async function ahamove(path:string,body?:unknown) {
  if(!process.env.AHAMOVE_BASE_URL||!process.env.AHAMOVE_TOKEN) throw new Error('Ahamove chưa cấu hình');
  const base=new URL(process.env.AHAMOVE_BASE_URL);
  if(base.protocol!=='https:'&&!(process.env.NODE_ENV==='test'&&base.hostname==='127.0.0.1')) throw new Error('Ahamove yêu cầu HTTPS');
  const r=await fetch(base.origin+'/v3'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+process.env.AHAMOVE_TOKEN,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!r.ok) throw new Error('Ahamove HTTP '+r.status);
  return r.json() as Promise<any>;
}
export function deliveryPath(store:any,destination:any) {
  return [{lat:Number(store.lat),lng:Number(store.lng),address:store.address+', '+store.district+', '+store.city,name:store.name,mobile:store.phone.replace(/\s/g,'')},
    {lat:Number(destination.lat),lng:Number(destination.lng),address:destination.address,name:destination.name,mobile:destination.phone,cod:destination.cod||0,tracking_number:destination.code}];
}
export async function dispatchOrder(orderId:number) {
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [orders]=await conn.query<any[]>('SELECT o.*,s.address as pickup_address,s.district,s.city,s.lat as pickup_lat,s.lng as pickup_lng,s.phone as pickup_phone,s.name as pickup_name,d.lat,d.lng,d.address as drop_address FROM orders o JOIN stores s ON s.id=o.store_id JOIN order_deliveries d ON d.order_id=o.id WHERE o.id=? FOR UPDATE',[orderId]);
    const o=orders[0];
    if(!o||o.status!=='READY') {await conn.rollback();return;}
    if(o.payment_method!=='cod'&&o.payment_status!=='paid') throw new Error('Chưa nhận tiền thanh toán điện tử');
    const [shipments]=await conn.query<any[]>('SELECT * FROM shipments WHERE order_id=?',[orderId]);
    if(shipments[0]?.provider_id){await conn.rollback();return;}
    const existing=shipments.length>0;
    if(!existing) await conn.execute('INSERT INTO shipments (order_id,provider,tracking_number,state) VALUES (?,"ahamove",?,"creating")',[o.id,o.code]);
    await conn.commit();
    let result:any;
    if(existing) {
      // A timed-out create is never blindly retried: reconcile using our unique tracking reference.
      const records=await ahamove('/orders/tracks/'+encodeURIComponent(o.code));
      if(!Array.isArray(records)||records.length!==1) throw new Error('Cần đối soát lệnh giao trước khi tạo lại');
      result={order_id:records[0]._id,status:records[0].status};
    } else {
      const pickup={name:o.pickup_name,phone:o.pickup_phone,address:o.pickup_address,district:o.district,city:o.city,lat:o.pickup_lat,lng:o.pickup_lng};
      try {
        result=await ahamove('/orders',{order_time:0,path:deliveryPath(pickup,{lat:o.lat,lng:o.lng,address:o.drop_address,name:o.receiver_name,phone:o.receiver_phone,code:o.code,cod:o.payment_method==='cod'&&o.payment_status!=='paid'?Number(o.total):0}),group_service_id:process.env.AHAMOVE_GROUP_SERVICE||'BIKE',group_requests:[],payment_method:'BALANCE',remarks:'Trái cây tươi, giao cẩn thận'});
      } catch(e) {await conn.execute('UPDATE shipments SET state="unknown" WHERE order_id=?',[o.id]);throw e;}
    }
    if(!result.order_id) {await conn.execute('UPDATE shipments SET state="unknown" WHERE order_id=?',[o.id]);throw new Error('Ahamove không trả mã đơn');}
    await conn.execute('UPDATE shipments SET provider_id=?,state=?,tracking_url=? WHERE order_id=?',[result.order_id,result.status||'ASSIGNING',result.shared_link||null,o.id]);
  } catch(e) {await conn.rollback();throw e;}finally{conn.release();}
}
