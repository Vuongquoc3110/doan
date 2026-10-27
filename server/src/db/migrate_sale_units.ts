import fs from 'fs';
import path from 'path';
import pool from './connection';
import { saleLabels } from '../utils/sale-units';
import { DATABASE_SQL_PATH } from './database_file';

async function migrate() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [variants] = await conn.query<any[]>(`SELECT v.*, p.name, p.is_gift, p.category_id FROM product_variants v JOIN products p ON p.id = v.product_id ORDER BY v.id FOR UPDATE`);
    const backupDir = path.join(__dirname, '../../../.local-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `variants-before-sale-units-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(variants, null, 2));
    const changes: { id: number; label: string }[] = [];
    for (const variant of variants) {
      const slot = /-(THUNG|L|VIP)$/.test(variant.sku) ? 1 : /-(1KG|M|E)$/.test(variant.sku) ? 0 : -1;
      if (slot < 0) continue; // Leave custom merchant-created variants alone.
      const label = saleLabels({ name: variant.name, isGift: variant.is_gift, categoryId: variant.category_id })[slot as 0 | 1];
      if (variant.label !== label) {
        await conn.query('UPDATE product_variants SET label = ? WHERE id = ?', [label, variant.id]);
      }
      changes.push({ id: variant.id, label });
    }
    const labels = new Map(changes.map(row => [row.id, row.label]));
    const original = fs.readFileSync(DATABASE_SQL_PATH, 'utf8');
    const start = original.indexOf('INSERT INTO `product_variants`');
    const end = original.indexOf(';', start);
    if (start < 0 || end < 0) throw new Error('SQL seed variant block missing');
    const block = original.slice(start, end).replace(/\((\d+), (\d+), '([^']*)', (\d+), '([^']*)'\)/g, (row, id, productId, label, price, sku) => {
      const updated = labels.get(Number(id));
      return updated ? `(${id}, ${productId}, '${updated}', ${price}, '${sku}')` : row;
    });
    const updatedSql = original.slice(0, start) + block + original.slice(end);
    const [check] = await conn.query<any[]>('SELECT id, price, sku FROM product_variants ORDER BY id');
    if (check.length !== variants.length || check.some((row, index) => row.id !== variants[index].id || row.sku !== variants[index].sku || Number(row.price) !== Number(variants[index].price))) throw new Error('Variant identity/price changed unexpectedly');
    await conn.commit();
    fs.writeFileSync(DATABASE_SQL_PATH, updatedSql, 'utf8');
    console.log(JSON.stringify({ updatedVariants: changes.length, preserved: 'IDs, SKU, prices, inventory and existing order snapshots', backupPath }));
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}
migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
