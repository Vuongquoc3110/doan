const assert = require('node:assert/strict');
const { saleLabels } = require('../../dist/utils/sale-units');
const cases = [
  ['Táo Envy New Zealand', 7, false, ['1 kg', '4 kg']],
  ['Nho Mẫu Đơn Hàn Quốc', 6, false, ['1 chùm', 'Hộp 4 chùm']],
  ['Dưa Lưới Nhật Musk Melon', 14, false, ['1 quả', 'Hộp 4 quả']],
  ['Hồng Sấy Dẻo Một Nắng Cheongdo Hàn Quốc', 18, false, ['1 hộp', 'Bộ 4 hộp']],
  ['Việt Quất Úc Hộp 125gram', 9, false, ['1 hộp (125 g)', 'Bộ 4 hộp (125 g/hộp)']],
  ['Nước Ép Táo Chai 250ml', 15, false, ['1 chai (250 ml)', 'Lốc 4 chai']],
  ['Giỏ Quà Sinh Nhật', 2, true, ['1 giỏ · Tiêu chuẩn', '1 giỏ · Cao cấp']],
  ['Táo Hộp 06 Quả', 7, false, ['1 hộp (6 quả)', 'Bộ 4 hộp (6 quả/hộp)']],
  ['Cherry Thùng 2kg', 4, false, ['1 thùng (2 kg)', 'Bộ 4 thùng']],
  ['Chuối Nhật', 13, false, ['1 nải', 'Bộ 4 nải']],
];
for (const [name, categoryId, isGift, expected] of cases) assert.deepEqual(saleLabels({ name, categoryId, isGift }), expected, name);
console.log('PASS: units for kg, bunch, piece, box, bottle, gift basket, explicit counts/weights, crate and banana hand.');
