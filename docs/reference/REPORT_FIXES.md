# Đối chiếu khắc phục báo cáo VQ FRUIT — 23/10/2026

Đã đối chiếu `BAO_CAO_TONG_HOP_DU_AN_VQ_FRUIT.doc` với mã nguồn và bổ sung khắc phục trực tiếp trong dự án. File báo cáo có khung cập nhật đầu tài liệu; nội dung khảo sát cũ được giữ để đối chiếu. Bản trước cập nhật nằm trong `.local-backups/`.

| Phát hiện trong báo cáo | Thay đổi |
| --- | --- |
| Dashboard cố định 14 ngày, thiếu Excel | Bộ chọn khoảng ngày, 7 ngày/tháng/quý; API tổng hợp cùng khoảng ngày cho doanh thu, đơn, chi nhánh và sản phẩm; xuất `.xlsx` gồm đơn hàng, VAT và tổng hợp. File xuất tối đa 10.000 đơn, yêu cầu chia khoảng ngày khi vượt giới hạn, không cắt dữ liệu âm thầm. |
| Đơn thiếu tìm kiếm, trạng thái, chi tiết | Tìm mã/tên/SĐT, lọc trạng thái và chi nhánh; modal riêng có từng dòng hàng, lịch sử, lời chúc, ruy băng và VAT. |
| Thiếu tạo sản phẩm và sửa quy cách | Form tải ảnh, tên, danh mục, xuất xứ và nhiều SKU/quy cách; chỉnh giá, tên và SKU từng biến thể. Sửa một biến thể không đổi giá các biến thể khác; giá cha cập nhật theo giá nhỏ nhất. |
| Kho thiếu bộ lọc/nhập nhà cung cấp | Lọc theo chi nhánh và tên/SKU; form nhập lô có mã lô, hạn dùng, số lượng và ghi chú; nguồn điều chuyển khởi tạo đúng chi nhánh của dòng đã chọn. |
| Chi nhánh thiếu API/is_active | Đã sửa từ đợt đồng bộ API trước; giữ nguyên migration và route quản trị. |
| Tìm người dùng không lọc, thiếu tạo nhân viên | Backend lọc họ tên/SĐT/email; form tạo nhân viên yêu cầu mật khẩu tối thiểu 8 ký tự, chi nhánh hoạt động và kiểm tra SĐT trùng. |
| Khóa tài khoản không chặn token cũ | Mỗi request xác thực kiểm tra trạng thái/vai trò/chi nhánh hiện tại từ DB; tài khoản khóa bị từ chối ngay. Không cho khóa Admin tại màn hình người dùng để tránh tự mất quyền quản trị. |
| Thiếu theo dõi voucher và quản lý banner | Danh sách voucher có điều kiện, lượt dùng, hạn; banner có ảnh, vị trí, nền tảng, lịch bắt đầu/kết thúc, mốc đếm ngược và bật/tắt. Trang khách lấy đúng banner còn hiệu lực, cập nhật mỗi phút. Đây là lịch quảng bá, chưa có cơ chế tự định giá Flash Sale. |
| Đổi trả không hiện ảnh, thiếu từ chối | Ảnh phóng to; quyết định có xác nhận, bắt buộc lý do từ chối; khách thấy trạng thái và lý do trong đơn. Phê duyệt là ghi nhận xử lý, không tự thực hiện chuyển khoản hoàn tiền. |
| Hộp thoại thao tác Web không chạy | Mã `react-native-web` cài trong dự án có `Alert.alert()` rỗng; đã dùng adapter có hàng đợi và nút xác nhận/hủy trên web. Android/iOS giữ Alert native. |
| Báo cáo mô tả GPS nhưng chưa kiểm tra | Bỏ vị trí giả trên Mobile, yêu cầu quyền GPS, kiểm tra độ chính xác và khoảng cách tới chi nhánh, ngăn check-in lặp khi ca chưa đóng. Bán kính mặc định 200m, tùy chỉnh `ATTENDANCE_RADIUS_METERS`. GPS là dữ liệu thiết bị gửi lên, chưa có cơ chế chống giả lập vị trí cấp thiết bị. |
| Cảnh báo tùy chọn TypeScript cũ | Server dùng `module` và `moduleResolution` là `Node16`, đã biên dịch thành công. |

## Các luồng mới

- Admin → Tổng quan: chọn khoảng ngày, Áp dụng, Xuất Excel. Web tải tệp; Android/iOS chia sẻ tệp qua hệ điều hành, cần build có `expo-file-system`/`expo-sharing`.
- Admin → Sản phẩm: Thêm sản phẩm; hoặc Giá từng quy cách. Sản phẩm mới có tồn kho 0; nhập tại mục Kho bằng lô có hạn dùng.
- Admin → Người dùng: Cấp tài khoản nhân viên; tìm tài khoản và xác nhận khóa/mở khóa.
- Admin → Kho: lọc chi nhánh/SKU, Nhập lô từ nhà cung cấp, điều chuyển từ chi nhánh của dòng đã chọn.
- Admin → Marketing: Theo dõi marketing → Banner/chiến dịch. Lịch dùng giờ Việt Nam; thay đổi có thể mất tối đa một phút để tự cập nhật ở trang khách.
- Admin → Phê duyệt: mở ảnh bằng chứng; duyệt hoặc nhập lý do từ chối. Khách xem phản hồi trong chi tiết đơn.

## Kiểm thử

```powershell
npm.cmd --prefix server run test:api-contract
node mobile/node_modules/typescript/bin/tsc --noEmit -p mobile/tsconfig.json
node mobile/src/utils/alert.test.cjs
node server/src/db/database_file.test.cjs
node server/src/test-storefront.cjs
```

151 ca HTTP chạy trên database tách biệt, có kiểm tra mở lại workbook Excel và đối chiếu tổng doanh thu. Các ca mới gồm tạo sản phẩm/nhân viên, giá biến thể không ảnh hưởng quy cách khác, lọc người dùng/kho, thu hồi truy cập sau khóa, lịch banner, lý do từ chối, GPS ngoài bán kính/độ chính xác kém/check-in trùng. Bộ adapter xác nhận Web kiểm tra callback chỉ chạy sau khi xác nhận, đúng thứ tự và hủy an toàn. Biên dịch và Metro export Web đã qua; chưa nghiệm thu giao diện trên thiết bị thật.

Phần dịch vụ ngoài và phần cứng thuộc Mục IV có mã nguồn từ đợt trước; trạng thái và điều kiện kích hoạt được ghi tại [OPERATIONS_FEATURES.md](OPERATIONS_FEATURES.md). Không chạy reset dữ liệu, không chuyển tiền, đặt chuyến giao hàng hay gửi tin thật trong đợt khắc phục này.
