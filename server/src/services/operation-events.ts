import { PoolConnection } from 'mysql2/promise';
export async function enqueueOrderEvents(conn:PoolConnection, order:any, key:string) {
  if(order.user_id) await conn.execute('INSERT IGNORE INTO operation_jobs (kind,dedupe_key,payload) VALUES ("push",?,?)',[key,JSON.stringify({orderId:order.id,userId:order.user_id,code:order.code,status:order.status})]);
  if(order.status==='READY'&&order.delivery_type==='ship') await conn.execute('INSERT IGNORE INTO operation_jobs (kind,dedupe_key,payload) VALUES ("dispatch",?,?)',['dispatch:'+order.id,JSON.stringify({orderId:order.id})]);
  if(process.env.ZNS_ENABLED==='true') await conn.execute('INSERT IGNORE INTO operation_jobs (kind,dedupe_key,payload) VALUES ("zns",?,?)',[key,JSON.stringify({orderId:order.id,phone:order.receiver_phone,code:order.code,status:order.status})]);
}
