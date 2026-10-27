import source from './catalog-source.json';

// Snapshot of public product cards on https://kleverfruits.com.vn/collections/all.
// Each name, photo and reference price comes from the SAME card; never rotate images.
export function catalogImage(slug: string): string | undefined {
  const product = source.find(p => p.slug === slug);
  return product ? `/uploads/products/catalog-${product.slug}.jpg` : undefined;
}
function category(slug: string): number {
  if (/20-10/.test(slug)) return 1;
  if (/gio-qua|hop-qua|khay-go|set-qua/.test(slug)) return 2;
  if (/cherry/.test(slug)) return 4;
  if (/nho/.test(slug)) return 5;
  if (/tao/.test(slug)) return 6;
  if (/^le-/.test(slug)) return 7;
  if (/dau-tay|mam-xoi/.test(slug)) return 8;
  if (/viet-quat/.test(slug)) return 9;
  if (/kiwi/.test(slug)) return 10;
  if (/man-|dao-/.test(slug)) return 11;
  if (/cam-|quyt-/.test(slug)) return 12;
  if (/nuoc-ep|sinh-to/.test(slug)) return 15;
  if (/viet-nam|moc-chau|da-lat/.test(slug)) return 13;
  return 18;
}
const countries: [RegExp, string][] = [[/new-zealand/, 'New Zealand'], [/nhat/, 'Nhật Bản'], [/han-quoc/, 'Hàn Quốc'], [/nam-phi/, 'Nam Phi'], [/(?:^|-)uc(?:-|$)/, 'Úc'], [/my(?:-|$)/, 'Mỹ'], [/phap/, 'Pháp'], [/peru/, 'Peru'], [/chile/, 'Chile'], [/viet-nam|moc-chau|da-lat/, 'Việt Nam']];
export const catalogProducts = source.map((p, index) => ({
  id: 157 + index, name: p.name, slug: p.slug, price: p.price,
  cmp: 0, disc: 0, cat: category(p.slug),
  origin: countries.find(([pattern]) => pattern.test(p.slug))?.[1] || 'Theo nhãn sản phẩm',
  isGift: /gio-qua|hop-qua|khay-go|set-qua/.test(p.slug) ? 1 : 0,
  emoji: '🛍️', desc: `${p.name}. Quy cách và xuất xứ theo nhãn sản phẩm.`,
}));
