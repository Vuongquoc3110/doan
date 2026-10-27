import { PoolConnection } from 'mysql2/promise';
export interface Allocation { batchId:number; qty:number; }
export async function consumeBatches(conn:PoolConnection, storeId:number, variantId:number, qty:number, allowExpired=false):Promise<Allocation[]> {
  const [batches] = await conn.query<any[]>(`SELECT * FROM inventory_batches WHERE store_id=? AND variant_id=? AND qty>0
    ${allowExpired ? '' : 'AND (expires_at IS NULL OR expires_at>NOW())'} ORDER BY received_at ASC,id ASC FOR UPDATE`,[storeId,variantId]);
  if (batches.reduce((sum,b)=>sum+Number(b.qty),0)<qty) throw Object.assign(new Error('Không đủ tồn kho lô còn hạn sử dụng'),{status:409});
  let remaining=qty;
  const result:Allocation[]=[];
  for(const batch of batches) {
    const take=Math.min(remaining,Number(batch.qty));
    if(!take) break;
    await conn.execute('UPDATE inventory_batches SET qty=qty-? WHERE id=?',[take,batch.id]);
    result.push({batchId:batch.id,qty:take}); remaining-=take;
  }
  return result;
}
export async function recordAllocations(conn:PoolConnection, orderId:number, allocations:Allocation[]) {
  for(const a of allocations) await conn.execute('INSERT INTO batch_allocations (order_id,batch_id,qty) VALUES (?,?,?)',[orderId,a.batchId,a.qty]);
}
export async function restoreBatches(conn:PoolConnection, orderId:number, storeId:number) {
  await conn.query('SELECT i.variant_id FROM inventory i JOIN order_items oi ON oi.variant_id=i.variant_id WHERE oi.order_id=? AND i.store_id=? ORDER BY i.variant_id FOR UPDATE',[orderId,storeId]);
  const [allocations]=await conn.query<any[]>('SELECT * FROM batch_allocations WHERE order_id=? AND restored=0 FOR UPDATE',[orderId]);
  if(allocations.length) {
    for(const a of allocations) await conn.execute('UPDATE inventory_batches SET qty=qty+? WHERE id=?',[a.qty,a.batch_id]);
    await conn.execute('UPDATE batch_allocations SET restored=1 WHERE order_id=? AND restored=0',[orderId]);
  } else {
    const [history]=await conn.query<any[]>('SELECT id FROM batch_allocations WHERE order_id=? LIMIT 1',[orderId]);
    if(history.length) return;
    const [items]=await conn.query<any[]>('SELECT variant_id,SUM(qty) as qty FROM order_items WHERE order_id=? GROUP BY variant_id',[orderId]);
    for(const i of items) await conn.execute(`INSERT INTO inventory_batches (store_id,variant_id,batch_no,qty,legacy) VALUES (?,?,'LEGACY',?,1)
      ON DUPLICATE KEY UPDATE qty=qty+VALUES(qty)`,[storeId,i.variant_id,i.qty]);
  }
}
export async function transferBatches(conn:PoolConnection, from:number, to:number, variant:number, qty:number) {
  const allocations=await consumeBatches(conn,from,variant,qty);
  for(const allocation of allocations) {
    const [rows]=await conn.query<any[]>('SELECT * FROM inventory_batches WHERE id=?',[allocation.batchId]);
    const b=rows[0];
    // Source batch ID makes cross-store lot numbers unambiguous while preserving original dates.
    await conn.execute(`INSERT INTO inventory_batches (store_id,variant_id,batch_no,qty,received_at,expires_at,legacy)
      VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE qty=qty+VALUES(qty)`,[to,variant,`TRANSFER-${b.id}`,allocation.qty,b.received_at,b.expires_at,b.legacy]);
  }
}
