# Giao diện VQ FRUIT hiện tại

## Màu và chữ

Màu gốc nằm trong `mobile/src/theme/tokens.ts`: xanh đậm `#183e32`, kem `#f7f5ef`, xanh nhạt `#e9ecdf`. Tiêu đề web dùng Times New Roman để hiển thị dấu tiếng Việt đồng nhất; nội dung dùng font hệ thống. Không yêu cầu tải font Google.

## Bố cục

- Trang chủ: phần giới thiệu và banner chia đôi trên màn hình rộng, xếp dọc trên điện thoại.
- Banner: ba ảnh chuyển mờ và zoom nhẹ mỗi 6,5 giây; không có nút điều khiển. Tôn trọng cài đặt giảm chuyển động và dừng khi rời màn hình.
- Danh mục: bộ lọc bên trái từ 1024px; màn hình nhỏ mở bộ lọc bằng bảng nổi. Hai cột sản phẩm ở màn hình nhỏ, ba cột từ 1024px, bốn cột từ 1440px.
- Thẻ sản phẩm: ảnh gần vuông, xuất xứ, tên, giá và hành động chọn mua tách rõ.
- Các màn hình khách hàng, nhân viên và quản trị tiếp tục dùng theme chung và định tuyến Expo Router.

## Khi sửa giao diện

Giữ nhãn tiếng Việt rõ ràng, vùng bấm dễ thao tác và trạng thái tải/lỗi/trống. Dùng `resolveMediaUrl` cho ảnh từ API. Giá, bộ lọc, số sản phẩm và kết quả nghiệp vụ phải dựa trên phản hồi API. Không dùng số liệu hoặc thông báo thành công giả để thay lỗi kết nối.

Tài liệu này mô tả triển khai hiện tại; các thành phần được đề xuất nhưng chưa tồn tại không nằm trong kiến trúc dự án.