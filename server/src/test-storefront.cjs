// Read-only integration checks against the running API and its actual catalog.
const assert = require('node:assert/strict');
const base = process.env.STOREFRONT_API_URL || 'http://localhost:4000/api/v1';
async function get(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, path);
  const body = await response.json();
  assert.equal(body.success, true, path);
  return body;
}
(async () => {
  const catalog = await get('/products?limit=100');
  assert(catalog.data.length > 0, 'Need seeded products');
  const page1 = await get('/products?limit=3&page=1&sort=price_asc');
  const page2 = await get('/products?limit=3&page=2&sort=price_asc');
  assert.equal(page1.pagination.total, catalog.pagination.total);
  assert(!page1.data.some(p => page2.data.some(q => q.id === p.id)), 'Pages overlap');
  const ranges = [
    ['under_500k', n => n < 500000], ['500k_1m', n => n >= 500000 && n <= 1000000],
    ['1m_2.5m', n => n > 1000000 && n <= 2500000], ['2.5m_5m', n => n > 2500000 && n <= 5000000], ['above_5m', n => n > 5000000],
  ];
  for (const [range, valid] of ranges) {
    const result = await get('/products?limit=100&price_range=' + range);
    assert(result.data.every(p => valid(Number(p.base_price))), range);
    if (catalog.pagination.total <= 100) assert.equal(result.pagination.total, catalog.data.filter(p => valid(Number(p.base_price))).length, range);
  }
  const gifts = await get('/products?limit=100&is_gift=1');
  assert(gifts.data.every(p => Number(p.is_gift) === 1));
  if (catalog.pagination.total <= 100) assert.equal(gifts.pagination.total, catalog.data.filter(p => Number(p.is_gift) === 1).length);
  const ascending = (await get('/products?limit=100&sort=price_asc')).data;
  assert(ascending.every((p, i) => !i || Number(p.base_price) >= Number(ascending[i - 1].base_price)));
  const descending = (await get('/products?limit=100&sort=price_desc')).data;
  assert(descending.every((p, i) => !i || Number(p.base_price) <= Number(descending[i - 1].base_price)));
  const origin = catalog.data.find(p => p.origin)?.origin;
  const local = await get('/products?origin=' + encodeURIComponent(origin));
  assert(local.data.every(p => p.origin.includes(origin)));
  const collections = await get('/collections');
  if (collections.data.length) await get('/products?collection_slug=' + encodeURIComponent(collections.data[0].slug));
  const detail = (await get('/products/' + catalog.data[0].id)).data;
  assert(detail.variants.length > 0);
  assert(detail.images.every(image => typeof image.url === 'string'));
  const suggestions = await get('/products/search-suggestions?q=' + encodeURIComponent(catalog.data[0].name.slice(0, 5)));
  assert(suggestions.data.some(p => p.id === catalog.data[0].id));
  const stores = (await get('/stores')).data;
  if (stores.length) {
    const city = stores[0].city;
    const filtered = (await get('/stores?city=' + encodeURIComponent(city))).data;
    assert.equal(filtered.length, stores.filter(s => s.city === city).length);
    assert(filtered.every(s => s.city === city));
  }
  const coupons = (await get('/coupons')).data;
  assert(coupons.every(c => new Date(c.expires_at).getTime() > Date.now()));
  console.log('PASS: pagination, five price ranges, gifts, price sorting, origin, collections, product variants/images, autocomplete, store city, active coupons.');
})().catch(error => { console.error(error); process.exitCode = 1; });
