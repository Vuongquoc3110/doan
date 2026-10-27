const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const session = 'sale_unit_check_' + Date.now();
  const base = 'http://localhost:4000/api/v1';
  try {
    const detail = await (await fetch(base + '/products/149')).json();
    assert.equal(detail.data.variants[0].label, '1 hộp');
    const variant = detail.data.variants[0];
    const added = await fetch(base + '/cart/items', { method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': session }, body: JSON.stringify({ variantId: variant.id, qty: 2 }) });
    assert.equal(added.status, 200);
    const cart = await (await fetch(base + '/cart', { headers: { 'x-session-id': session } })).json();
    assert.equal(cart.data.items.length, 1);
    assert.equal(cart.data.items[0].variant_id, variant.id);
    assert.equal(cart.data.items[0].variant_label, '1 hộp');
    assert.equal(cart.data.items[0].qty, 2);
    assert.equal(cart.data.subtotal, Number(variant.price) * 2);
    const catalog = await (await fetch(base + '/products?limit=100')).json();
    assert(catalog.data.every(p => p.sale_label));
    console.log('PASS: selected variant, sale label, 2 x box price, catalog sale units.');
  } finally {
    // Delete only this test's disposable guest cart; never touch a user's cart.
    const conn = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'klever_fruits_db' });
    try {
      await conn.query('DELETE ci FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.session_id = ?', [session]);
      await conn.query('DELETE FROM carts WHERE session_id = ?', [session]);
    } finally { await conn.end(); }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
