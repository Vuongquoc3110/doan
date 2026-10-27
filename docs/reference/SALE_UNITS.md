# Quy cách bán hàng

Quy cách được lưu ở `product_variants.label`. API, giỏ hàng và checkout sử dụng ID biến thể, số lượng và giá của chính biến thể đó.

- Trái cây bán cân: kg; quy cách lớn có khối lượng riêng.
- Nho: chùm, hoặc khối lượng đã ghi rõ trong tên sản phẩm.
- Dưa, bưởi: quả; chuối: nải.
- Dâu, việt quất, cherry, trái cây sấy/cắt sẵn: hộp/khay.
- Nước ép: chai/lốc; quà tặng: giỏ/hộp/mâm; thẻ quà: thẻ.
- Quy cách ghi rõ khối lượng/dung tích/số quả trong tên được ưu tiên.

Giá là giá cho toàn bộ quy cách chọn. Ví dụ `2 × 1 hộp (125 g)` là hai hộp; `2 × 4 kg` là hai gói 4 kg. Số lượng là số nguyên quy cách, không phải tự nhập số kg lẻ. Không suy diễn trọng lượng của một quả hoặc chùm khi không có dữ liệu.

Đợt cập nhật giữ nguyên ID, SKU, giá biến thể, số lượng tồn và snapshot của đơn hàng đã có. Các quy cách lớn tương ứng với giá đã có trước đó; không tự đặt giá mới. Nhãn biến thể được tạo thủ công ngoài các SKU mẫu không bị cập nhật bởi script.

Quy tắc sinh mẫu: `server/src/utils/sale-units.ts`. Cập nhật nhãn cho dữ liệu hiện tại: `server/src/db/migrate_sale_units.ts`; script lưu bản sao biến thể vào `.local-backups/` và cập nhật nhãn trong `database.sql`, không chạy lại seed.

Kiểm tra từ `server/`: `npm run build`, `node src/utils/sale-units.test.cjs`, `node src/test-sale-units.cjs`. Bài kiểm tra API dùng một giỏ khách riêng và xóa sau khi chạy, không đặt đơn hay trừ kho.
