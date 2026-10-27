import pool from './connection';
import { getSeedProducts } from './seed_generator';
import { catalogImage } from './product_catalog';
import { saleLabels } from '../utils/sale-units';
import { migrateOperations } from './migrate_operations';
import fs from 'fs';
import path from 'path';

async function updateCatalog() {
  const products = getSeedProducts();
  for (const p of products) {
    const photo = catalogImage(p.slug);
    if (photo && !fs.existsSync(path.join(__dirname, '../..', photo))) throw new Error(`Missing photo: ${photo}`);
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let added = 0, updated = 0, hidden = 0;
    const [stores] = await conn.query<any[]>('SELECT id FROM stores');
    for (const p of products) {
      const [existing] = await conn.query<any[]>('SELECT id FROM products WHERE slug = ?', [p.slug]);
      const photo = catalogImage(p.slug);
      if (!photo) {
        // Only hide legacy demo products still using the unrelated rotating photo pool.
        if (existing.length) {
          const [images] = await conn.query<any[]>('SELECT url FROM product_images WHERE product_id = ?', [existing[0].id]);
          if (images.length && images.every(i => i.url.includes('images.unsplash.com/') || i.url === `/uploads/products/${p.slug}.svg`)) {
            await conn.execute("UPDATE products SET status = 'inactive' WHERE id = ?", [existing[0].id]);
            hidden++;
          }
        }
        continue;
      }
      let id: number;
      if (existing.length) {
        id = existing[0].id;
        await conn.execute("UPDATE products SET name = ?, status = 'active' WHERE id = ?", [p.name, id]);
        updated++;
      } else {
        const [result] = await conn.execute<any>("INSERT INTO products (name, slug, description, origin, base_price, compare_price, discount_percent, category_id, is_gift, status) VALUES (?, ?, ?, ?, ?, NULL, 0, ?, ?, 'active')", [p.name, p.slug, p.desc, p.origin, p.price, p.cat, p.isGift]);
        id = result.insertId;
        const label = saleLabels({name: p.name, isGift: p.isGift, categoryId: p.cat})[0];
        const [variant] = await conn.execute<any>('INSERT INTO product_variants (product_id, label, price, sku) VALUES (?, ?, ?, ?)', [id, label, p.price, `CAT-${id}-STD`]);
        for (const store of stores) await conn.execute('INSERT INTO inventory (store_id, variant_id, qty) VALUES (?, ?, 20)', [store.id, variant.insertId]);
        added++;
      }
      const collections = [p.disc > 10 ? 1 : 2];
      if ([1, 2, 3].includes(p.cat)) collections.push(3);
      if ([4, 5, 6, 7, 8, 9, 10, 11, 12].includes(p.cat)) collections.push(4);
      if (p.isGift) collections.push(5);
      if ([4, 5, 8, 9].includes(p.cat)) collections.push(7);
      if (p.cat === 17) collections.push(8);
      for (const collection of collections) {
        await conn.execute('INSERT IGNORE INTO product_collections (product_id, collection_id) SELECT ?, id FROM collections WHERE id = ?', [id, collection]);
      }
      await conn.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
      await conn.execute('INSERT INTO product_images (product_id, url, sort) VALUES (?, ?, 1)', [id, photo]);
    }
    await conn.commit();
    await migrateOperations();
    console.log(JSON.stringify({added, updated, hidden}));
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}
updateCatalog().catch(error => { console.error(error.message); process.exitCode = 1; });
