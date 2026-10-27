const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = 'http://localhost:4000';
const report = { checked: 0, products: 0, images: 0, externalImagesSkipped: 0, failures: [] };
async function get(path) {
  const r = await fetch(origin + '/api/v1' + path, { signal: AbortSignal.timeout(15000) });
  assert.equal(r.status, 200, path);
  const j = await r.json(); assert.equal(j.success, true, path); report.checked++; return j;
}
async function parallel(items, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) { const item = queue.shift(); try { await fn(item); } catch (e) { report.failures.push(String(e.message)); } }
  }));
}
(async () => {
  const products = [];
  for (let page = 1; ; page++) {
    const j = await get('/products?limit=100&page=' + page);
    products.push(...j.data);
    if (page >= j.pagination.totalPages) break;
  }
  assert.equal(new Set(products.map(p => p.id)).size, products.length);
  const images = new Set();
  await parallel(products, async p => {
    const d = (await get('/products/' + p.id + '?store_id=1')).data;
    assert(d.name && d.variants.length, 'Missing product variants: ' + p.id);
    assert(d.variants.every(v => Number(v.price) > 0), 'Invalid variant price: ' + p.id);
    if (p.thumbnail) images.add(p.thumbnail);
    for (const image of d.images || []) if (image.url) images.add(image.url);
    report.products++;
  });
  await parallel([...images], async path => {
    const url = new URL(path, origin);
    if (url.origin !== origin) { report.externalImagesSkipped++; return; }
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    assert.equal(r.status, 200, 'Broken image: ' + path);
    assert(r.headers.get('content-type')?.startsWith('image/'), 'Invalid image content: ' + path);
    report.images++;
  });
  for (const path of ['/categories', '/collections', '/stores', '/job-posts', '/coupons', '/capabilities', '/banners?placement=home_hero&platform=web', '/banners?placement=category_top&platform=mobile']) await get(path);
  for (const type of ['news', 'video']) {
    const list = (await get('/articles?type=' + type)).data;
    assert(list.every(a => a.type === type));
    for (const a of list) {
      assert(a.cover && a.excerpt && a.published_at, 'Missing article display data: ' + a.id);
      assert.equal((await get('/articles/' + a.id)).data.id, a.id);
    }
  }
  fs.writeFileSync('customer-audit-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (report.failures.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
