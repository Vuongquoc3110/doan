import { pool } from './connection';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Additive, transactional and repeat-safe. Never resets existing business data.
const TAG = 'SIM20261027';
async function main() {
  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query<any[]>('SELECT id FROM orders WHERE code LIKE ? LIMIT 1', [`${TAG}-%`]);
    if (existing.length) { console.log('Simulation already imported; no changes.'); return; }
    const backupDir = path.resolve(__dirname, '../../../.local-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `before-${TAG}-${Date.now()}.json`);
    const backup: Record<string, unknown> = {};
    for (const table of ['users', 'customer_profiles', 'addresses', 'orders', 'order_items', 'order_status_history', 'inventory', 'inventory_batches', 'batch_allocations']) {
      const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
      backup[table] = rows;
    }
    fs.writeFileSync(backupFile, JSON.stringify(backup));
    await conn.beginTransaction();
    const [duplicate] = await conn.query<any[]>('SELECT id FROM users WHERE email LIKE ?', [`${TAG.toLowerCase()}-%@example.invalid`]);
    if (duplicate.length) throw new Error('Simulation customer marker already exists; refusing duplicate import.');
    const [stores] = await conn.query<any[]>('SELECT * FROM stores WHERE is_active=1 ORDER BY id');
    const [variants] = await conn.query<any[]>(`SELECT v.*,p.name FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.status='active' AND v.price>0 ORDER BY v.id LIMIT 80`);
    if (!stores.length || !variants.length) throw new Error('Active stores and products are required.');
    const [clock] = await conn.query<any[]>('SELECT DATE_FORMAT(CURDATE(),"%Y-%m-%d") as today');
    const today = clock[0].today;
    const dateAt = (days: number, hour = 10) => {
      const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - days);
      return `${d.toISOString().slice(0, 10)} ${String(hour).padStart(2, '0')}:00:00`;
    };
    const password = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 10);
    const names = ['Nguyễn Minh Anh', 'Trần Hoàng Nam', 'Lê Phương Linh', 'Phạm Tuấn Kiệt', 'Vũ Thu Hà', 'Đỗ Ngọc Mai', 'Bùi Đức Huy', 'Đặng Hải Yến', 'Hoàng Gia Bảo', 'Võ Khánh An'];
    const customers: any[] = [];
    for (let i = 0; i < 120; i++) {
      const store = stores[i % stores.length], name = `[Mô phỏng] ${names[i % names.length]} ${i + 1}`;
      const phone = `000${String(i + 1).padStart(7, '0')}`;
      const [result] = await conn.execute<any>(`INSERT INTO users (phone,email,password_hash,full_name,role,status,created_at) VALUES (?,?,?,?,'customer','active',?)`, [phone, `${TAG.toLowerCase()}-${i + 1}@example.invalid`, password, name, dateAt(100 + i % 30)]);
      customers.push({ id: result.insertId, name, phone });
      await conn.execute('INSERT INTO customer_profiles (user_id,tier,points) VALUES (?,"bronze",0)', [result.insertId]);
      await conn.execute('INSERT INTO addresses (user_id,receiver,phone,province,district,ward,detail,is_default) VALUES (?,?,?,?,?,?,?,1)', [result.insertId, name, phone, store.city, store.district, 'Địa chỉ mô phỏng', `${i + 1} Đường Mô Phỏng`]);
    }
    const batches = new Map<string, number>();
    for (const store of stores) for (let i = 0; i < variants.length; i++) {
      const v = variants[i], qty = 35 + i % 45;
      await conn.execute('INSERT INTO inventory (store_id,variant_id,qty) VALUES (?,?,?) ON DUPLICATE KEY UPDATE qty=qty+VALUES(qty)', [store.id, v.id, qty]);
      const [result] = await conn.execute<any>('INSERT INTO inventory_batches (store_id,variant_id,batch_no,qty,received_at,expires_at,legacy) VALUES (?,?,?,?,?,DATE_ADD(CURDATE(),INTERVAL 21 DAY),0)', [store.id, v.id, TAG, qty, dateAt(95)]);
      batches.set(`${store.id}:${v.id}`, result.insertId);
    }
    let revenue = 0, completed = 0;
    for (let i = 0; i < 600; i++) {
      const days = i < 160 ? i % 14 : 14 + i % 76;
      const status = i % 13 === 0 ? 'CANCELLED' : days < 2 && i % 3 === 0 ? ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPING'][i % 5] : 'COMPLETED';
      const customer = customers[(i * 7) % customers.length], store = stores[(i * 5 + Math.floor(i / 22)) % stores.length];
      const items = Array.from({ length: 1 + i % 3 }, (_, j) => ({ v: variants[(i * 7 + j * 13) % variants.length], qty: 1 + (i + j) % 2 }));
      const subtotal = items.reduce((sum, item) => sum + Number(item.v.price) * item.qty, 0);
      const pickup = i % 4 === 0, ship = pickup ? 0 : 25000, discount = i % 7 === 0 ? Math.min(50000, Math.floor(subtotal * .05)) : 0;
      const total = subtotal + ship - discount, created = dateAt(days, 8 + i % 11);
      const [result] = await conn.execute<any>(`INSERT INTO orders (code,user_id,store_id,receiver_name,receiver_phone,receiver_address,receiver_district,receiver_city,delivery_type,delivery_date,delivery_slot,greeting_message,subtotal,ship_fee,discount,total,payment_method,payment_status,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [`${TAG}-${String(i + 1).padStart(5, '0')}`, customer.id, store.id, customer.name, customer.phone, 'Địa chỉ mô phỏng phục vụ đồ án', store.district, store.city, pickup ? 'pickup' : 'ship', created.slice(0, 10), '09:00 - 12:00', 'DỮ LIỆU MÔ PHỎNG — không giao hàng hoặc thu tiền', subtotal, ship, discount, total, ['cod', 'vietqr', 'vnpay'][i % 3], status === 'COMPLETED' ? 'paid' : 'unpaid', status, created]);
      const id = result.insertId;
      for (const { v, qty } of items) {
        await conn.execute('INSERT INTO order_items (order_id,variant_id,product_name,variant_label,unit_price,qty,total_price) VALUES (?,?,?,?,?,?,?)', [id, v.id, v.name, v.label, v.price, qty, Number(v.price) * qty]);
        if (status !== 'CANCELLED') {
          const batch = batches.get(`${store.id}:${v.id}`)!;
          const [deduct] = await conn.execute<any>('UPDATE inventory_batches SET qty=qty-? WHERE id=? AND qty>=?', [qty, batch, qty]);
          if (deduct.affectedRows !== 1) throw new Error('Simulation lot exhausted; transaction rolled back.');
          await conn.execute('UPDATE inventory SET qty=qty-? WHERE store_id=? AND variant_id=?', [qty, store.id, v.id]);
          await conn.execute('INSERT INTO batch_allocations (order_id,batch_id,qty) VALUES (?,?,?)', [id, batch, qty]);
        }
      }
      const flow = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPING', 'COMPLETED'];
      const history = status === 'CANCELLED' ? ['PENDING', 'CANCELLED'] : flow.slice(0, flow.indexOf(status) + 1);
      for (const state of history) await conn.execute('INSERT INTO order_status_history (order_id,status,note,created_at) VALUES (?,?,?,?)', [id, state, 'Mô phỏng phục vụ đồ án', created]);
      if (status === 'COMPLETED') {
        completed++; revenue += total;
        await conn.execute('UPDATE customer_profiles SET points=points+? WHERE user_id=?', [Math.floor(total / 10000), customer.id]);
      }
    }
    const [bad] = await conn.query<any[]>(`SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE o.code LIKE ? GROUP BY o.id HAVING SUM(oi.total_price)<>MAX(o.subtotal) OR MAX(o.total)<>MAX(o.subtotal+o.ship_fee-o.discount)`, [`${TAG}-%`]);
    if (bad.length) throw new Error('Order totals do not reconcile.');
    await conn.commit();
    const summary = { label: 'Dữ liệu mô phỏng', tag: TAG, customers: 120, orders: 600, completed, revenue, inventoryLots: batches.size, from: dateAt(89).slice(0, 10), to: today, backupFile };
    fs.writeFileSync(path.join(backupDir, `${TAG}-summary.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); await pool.end(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
