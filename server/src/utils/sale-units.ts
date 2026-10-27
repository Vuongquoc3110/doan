export interface SaleProduct {
  name: string;
  isGift?: boolean | number;
  categoryId?: number;
}

// Two existing SKU slots are retained: standard and bulk/premium.
// Prices, stock and SKU identifiers are independent of the display labels.
export function saleLabels(product: SaleProduct): [string, string] {
  const name = product.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  if (product.categoryId === 16 || /gift.?card|e.?voucher|membership|the thanh vien/.test(name)) return ['1 thẻ điện tử', '1 thẻ kèm hộp quà'];
  if (product.isGift) {
    const unit = /mam/.test(name) ? 'mâm' : /gio/.test(name) ? 'giỏ' : 'hộp';
    return [`1 ${unit} · Tiêu chuẩn`, `1 ${unit} · Cao cấp`];
  }
  const weight = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|gram|gr|g)\b/);
  const weightText = weight ? `${weight[1].replace(',', '.')} ${weight[2] === 'kg' ? 'kg' : 'g'}` : '';
  const capacity = name.match(/(\d+(?:[.,]\d+)?)\s*(ml|lit|l)\b/);
  const capacityText = capacity ? `${capacity[1]} ${capacity[2] === 'lit' ? 'l' : capacity[2]}` : '';
  const pieces = name.match(/(?:hop|khay)\s*(\d+)\s*(?:qua|trai)/);
  if (pieces) return [`1 hộp (${Number(pieces[1])} quả)`, `Bộ 4 hộp (${Number(pieces[1])} quả/hộp)`];
  if (/thung/.test(name)) return [`1 thùng${weightText ? ` (${weightText})` : ''}`, 'Bộ 4 thùng'];
  if (/loc/.test(name) && /chai|nuoc|juice/.test(name)) return ['1 lốc', 'Bộ 4 lốc'];
  if (/nuoc|juice|sinh to|chai/.test(name) || product.categoryId === 15) return [`1 chai${capacityText ? ` (${capacityText})` : ''}`, 'Lốc 4 chai'];
  if (/tui/.test(name)) return [`1 túi${weightText ? ` (${weightText})` : ''}`, 'Bộ 4 túi'];
  if (/hop|khay|say deo|say kho|viet quat|dau tay|cherry|berry/.test(name) || [4, 8, 9].includes(product.categoryId || 0)) {
    const unit = /khay/.test(name) ? 'khay' : 'hộp';
    return [`1 ${unit}${weightText ? ` (${weightText})` : ''}`, `Bộ 4 ${unit}${weightText ? ` (${weightText}/${unit})` : ''}`];
  }
  if (/nho|chum/.test(name) || [5].includes(product.categoryId || 0)) {
    if (weightText && !/chum/.test(name)) return [weightText, `${Number(weight![1].replace(',', '.')) * 4} ${weight![2] === 'kg' ? 'kg' : 'g'}`];
    return [`1 chùm${weightText ? ` (${weightText})` : ''}`, 'Hộp 4 chùm'];
  }
  if (/chuoi|nai chuoi/.test(name)) return ['1 nải', 'Bộ 4 nải'];
  if (/dua|buoi/.test(name)) return ['1 quả', 'Hộp 4 quả'];
  if (product.categoryId === 14 || /cat san/.test(name)) return ['1 hộp', 'Bộ 4 hộp'];
  if (/set|combo|vitamin/.test(name) || product.categoryId === 17) return ['1 bộ', 'Gói 4 bộ'];
  if (weightText) return [weightText, `${Number(weight![1].replace(',', '.')) * 4} ${weight![2] === 'kg' ? 'kg' : 'g'}`];
  return ['1 kg', '4 kg'];
}
