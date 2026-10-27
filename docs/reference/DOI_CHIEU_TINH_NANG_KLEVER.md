# Đối chiếu tính năng cửa hàng

Khảo sát ngày 18/10/2026: https://kleverfruits.com.vn/, https://kleverfruits.com.vn/collections/san-pham và https://kleverfruits.com.vn/cart.

Triển khai trong ứng dụng VQ FRUIT hiện tại, sử dụng cơ sở dữ liệu và API của dự án. Không nhập đơn hàng, tài khoản hoặc dữ liệu khách hàng từ website tham khảo.

| Nhóm | Thực hiện trong dự án |
|---|---|
| Điều hướng mua hàng | Thêm menu danh mục, bộ sưu tập theo dữ liệu API, liên kết cửa hàng và hỗ trợ; dùng trên trang chủ và danh mục |
| Bộ sưu tập quà tặng | Thêm khu vực khám phá bộ sưu tập, lọc theo collection_slug và chỉ quà tặng |
| Tìm kiếm | Bổ sung gợi ý sản phẩm, trì hoãn truy vấn 300 ms và điều hướng vào chi tiết |
| Bộ lọc | Sửa tham số giá/xuất xứ; đủ năm khoảng giá; đồng bộ category_id, collection_slug và gift khi đổi liên kết |
| Sắp xếp | Giá, tên hai chiều, thời gian hai chiều, giảm giá; nổi bật dựa trên bộ sưu tập best-seller |
| Danh sách sản phẩm | Phân trang 24 mục, tổng số từ máy chủ, ảnh và giá đọc đúng trường dữ liệu; lưới 2/3/4 cột |
| Chi tiết | Sửa ảnh, thêm chọn ảnh, đánh giá và sản phẩm liên quan; mua ngay qua biến thể thật; không khẳng định tồn kho khi chưa kiểm tra |
| Yêu thích | Nối lại API /me/wishlist và trạng thái thực, sửa ảnh/giá và chọn biến thể |
| Khu vực mua hàng | Lọc thành phố, quận/huyện, tên/địa chỉ; số lượng chi nhánh từ dữ liệu; GPS dùng vị trí được cấp quyền, đọc đúng danh sách kết quả |
| Thanh toán | Thêm ngày nhận, thẻ quà tặng và yêu cầu hóa đơn; sửa kiểm tra coupon; khớp phí giao và quy đổi điểm; đọc đúng mã đơn và thông tin QR từ máy chủ |
| Ưu đãi | API liệt kê coupon còn hạn; bỏ mã giả dự phòng; dùng mã chuyển sang thanh toán để kiểm tra |
| Góp ý | Sửa endpoint và các trường liên hệ; chỉ báo thành công khi máy chủ xác nhận |
| Tuyển dụng | Bỏ vị trí giả dự phòng; form nộp hồ sơ trực tiếp vào API dự án |
| Cẩm nang / tài khoản / đơn hàng / đổi trả | Tái sử dụng các màn hình hiện có; thêm đường dẫn từ menu. Chưa kiểm tra toàn bộ các luồng này bằng trình duyệt |

## Kiểm chứng

- `cd mobile` rồi `node node_modules/typescript/bin/tsc --noEmit`.
- `cd server` rồi `npm.cmd run build`.
- Khi backend và database đã chạy: `cd server` rồi `node src/test-storefront.cjs`.
- `cd mobile` rồi `npx.cmd expo export --platform web --output-dir .web-check`.

Kiểm thử API chỉ đọc: phân trang, năm mức giá, quà tặng, thứ tự giá, xuất xứ, truy cập bộ sưu tập, cấu trúc ảnh/biến thể, gợi ý tìm kiếm, lọc cửa hàng và coupon còn hiệu lực. Không tạo đơn, trừ tồn kho hay gửi hồ sơ/góp ý trong kiểm thử này.

## Những phần chưa thể coi là tương đương hoàn toàn

- Chưa xác nhận giao diện và thao tác đầu cuối bằng Computer Use: phiên hiện tại không có trình duyệt kết nối.
- VNPAY đang là mã sandbox có sẵn; thanh toán thật, xác minh giao dịch QR và callback cần cấu hình nhà cung cấp. Yêu cầu hóa đơn được lưu cùng đơn, chưa kết nối dịch vụ phát hành hóa đơn điện tử.
- SMS/OTP thật, email thông báo, Messenger/Zalo và hotline riêng cần tài khoản/cấu hình của VQ FRUIT. Không dùng tài khoản liên lạc của website tham khảo thay cho VQ FRUIT.
- Danh mục, dịp tặng, bộ sưu tập và sản phẩm hiển thị theo dữ liệu hiện có. Không tự tạo những sản phẩm hoặc tồn kho chưa có trong database.
- Các trang pháp lý riêng (bảo mật, mua hàng, thành viên, hóa đơn), catalogue tải xuống, video giới thiệu và tích hợp chat chưa được bổ sung trong đợt này. Nội dung chính sách cần phản ánh hoạt động thực tế của VQ FRUIT.

Đây là phần triển khai các luồng mua hàng và hỗ trợ đã đối chiếu, chưa phải xác nhận sao chép đầy đủ mọi chức năng của website tham khảo.
