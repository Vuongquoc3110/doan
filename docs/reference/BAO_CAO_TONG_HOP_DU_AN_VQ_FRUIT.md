# BÁO CÁO TỔNG HỢP & PHẢN BIỆN TOÀN DIỆN DỰ ÁN VQ FRUIT (KLEVER FRUIT)
**Hệ Thống Bán Lẻ Trái Cây Nhập Khẩu & Giỏ Quà Tặng Cao Cấp (Expo Router & Node.js Express/MySQL)**

---

## Bảng thông tin tổng quan

| Thông tin | Chi tiết |
| :--- | :--- |
| **Dự án** | VQ FRUIT (Klever Fruit Omnichannel) |
| **Mô hình chuỗi** | 22 Chi nhánh bán lẻ (Hà Nội & TP.HCM) |
| **Frontend** | React Native / Expo Router v57 (Hỗ trợ Web & Mobile App) |
| **Backend** | Node.js, Express, TypeScript, MySQL 8 / MariaDB (34 bảng) |
| **Tài khoản Admin** | SĐT: `0900000001` / Mật khẩu: `1` |
| **File Word báo cáo** | `BAO_CAO_TONG_HOP_DU_AN_VQ_FRUIT.doc` (Nằm ngay tại thư mục gốc dự án) |

---

## I. TỔNG QUAN KIẾN TRÚC & PHẠM VI NGHIỆP VỤ

Dự án **VQ FRUIT** được xây dựng theo mô hình **O2O (Online-to-Offline)** nhằm quản trị và vận hành chuỗi 22 cửa hàng bán lẻ trái cây nhập khẩu và giỏ quà tặng biếu sang trọng. Hệ thống kết nối đồng bộ giữa trải nghiệm mua sắm trực tuyến của người tiêu dùng (Mobile App / Web) với nghiệp vụ bán hàng tại quầy (POS), quản trị kho hàng tủ mát và điều phối đơn hàng đa kênh của đội ngũ nhân viên và ban giám đốc.

Hệ sinh thái của dự án bao gồm 3 phân hệ người dùng chính:
1. **Cổng Khách hàng (Customer Storefront)**: Khám phá bộ sưu tập quà tặng, trái cây tươi cao cấp theo nguồn gốc xuất xứ, giỏ hàng, tùy biến quà biếu (thiệp mừng, ruy-băng), yêu cầu xuất hóa đơn VAT, thanh toán VietQR động và tra cứu trạng thái đơn hàng cùng chính sách bảo hành 48 giờ.
2. **Cổng Nhân viên chi nhánh (Staff Operations & POS)**: Điểm danh chấm công GPS theo bán kính cửa hàng, tạo đơn bán lẻ tại quầy POS, tra cứu thông tin tích điểm khách hàng qua SĐT, quản lý kiểm kê tủ mát, báo hao hụt hàng ngày và xử lý tiếp nhận khiếu nại đổi trả.
3. **Cổng Quản trị trung tâm (Admin Workspace)**: Giám sát chỉ số kinh doanh toàn chuỗi (doanh thu, đơn hàng, khách hàng), điều chuyển đơn hàng liên chi nhánh, điều phối cân bằng kho hàng, duyệt hoàn tiền khiếu nại, phát hành Gift Card doanh nghiệp và quản trị tài khoản người dùng.

---

## II. ĐÁNH GIÁ CÁC TÍNH NĂNG ĐÃ LÀM RẤT TỐT (ĐIỂM SÁNG)

### 1. Kiểm soát tồn kho nghiêm ngặt & Khóa chống bán vượt (Pessimistic Locking)
- Áp dụng cơ chế **Database Transaction với cú pháp `SELECT ... FOR UPDATE`** trên bảng `inventory` khi checkout hoặc tạo đơn POS.
- Ngăn chặn triệt để lỗi *Race Condition / Over-selling* (nhiều khách cùng thanh toán sản phẩm cuối cùng tại một điểm bán). Tự động rollback an toàn nếu thiếu hàng.

### 2. Chuẩn hóa quy cách đóng gói đặc thù theo ngành trái cây
- Module `sale-units.ts` tự động phân tích tên gọi, danh mục và đặc tính sản phẩm:
  - Giỏ quà / Hộp quà: *1 giỏ · Tiêu chuẩn* và *1 giỏ · Cao cấp*.
  - Khay/Hộp nhập khẩu (Cherry, Việt quất, Dâu tây): *1 hộp/khay (trọng lượng)* và *Bộ 4 hộp/khay*.
  - Chùm / Quả lớn (Nho sữa, Bưởi, Dưa lưới): *1 chùm* hoặc *1 quả*.
  - Nước ép / Sinh tố: *1 chai* và *Lốc 4 chai*.

### 3. Nghiệp vụ giỏ quà biếu & Khách hàng doanh nghiệp chỉn chu
- Chọn màu ruy-băng thắt giỏ: *Tím Klever VIP, Đỏ Hoàng Gia, Vàng Ánh Kim*.
- Nhập lời chúc in thiệp trang trọng miễn phí.
- Lựa chọn ngày giao và khung giờ nhận linh hoạt (Giao hỏa tốc 2 giờ, Sáng, Chiều, Tối).
- Tích hợp form yêu cầu xuất hóa đơn VAT cho doanh nghiệp (Tên công ty, MST) ngay trong luồng checkout.

### 4. Cam kết bảo hành & Đổi trả chất lượng trong 48 Giờ
- Máy chủ tự động tính toán thời gian kể từ thời điểm đơn hàng chuyển sang `COMPLETED`.
- Nếu $\le 48$ giờ: Khách hàng có quyền gửi yêu cầu đổi trả kèm hình ảnh và số tài khoản nhận tiền hoàn; nếu quá 48 giờ hệ thống tự động khóa nút đổi trả theo chính sách.

### 5. Thanh toán VietQR động chuẩn Napas 247
- Tự động sinh mã VietQR theo chuẩn Napas với ngân hàng MB Bank, số tài khoản, số tiền chính xác từng đồng và nội dung chuyển khoản là mã đơn hàng duy nhất (`KF26xxxxxx`).

### 6. Tìm kiếm cửa hàng gần nhất bằng định vị GPS (Haversine Formula)
- Tận dụng GPS thiết bị và công thức lượng giác Haversine tính toán khoảng cách đường chim bay đến tọa độ của 22 chi nhánh để gợi ý cửa hàng gần nhất.

---

## III. KIỂM THỬ & PHẢN BIỆN CHI TIẾT TRANG QUẢN TRỊ ADMIN

Sau khi đăng nhập tài khoản Quản trị viên (SĐT: `0900000001` / Mật khẩu: `1`), hệ thống chuyển trực tiếp vào không gian làm việc Admin (`/(admin)`):

| Phân hệ Admin | Tính năng đã hoạt động tốt | Điểm hạn chế / Lỗi phát hiện | Đánh giá & Khuyến nghị |
| :--- | :--- | :--- | :--- |
| **1. Tổng quan (Dashboard)** | 4 thẻ KPI doanh thu, đơn hàng, khách hàng, sản phẩm; Biểu đồ cột 14 ngày từ view SQL; Top 5 chi nhánh; Top 5 sản phẩm bán chạy. | Cố định 14 ngày, chưa có bộ lọc chọn khoảng ngày linh hoạt; Chưa có nút xuất báo cáo Excel cho kế toán. | **TỐT (8.5/10)**<br>Cần thêm bộ lọc ngày linh hoạt. |
| **2. Quản lý Đơn hàng (Orders)** | Xem danh sách đơn hàng 22 chi nhánh; Có tính năng Điều chuyển đơn hàng sang chi nhánh khác tiếp nhận. | Chưa có ô tìm kiếm mã đơn / tên khách; Chưa có tab lọc trạng thái; Chưa bấm xem chi tiết từng món hàng trong đơn và thông tin VAT. | **TRUNG BÌNH (6.5/10)**<br>Cần bổ sung Modal xem chi tiết đơn hàng & bộ lọc. |
| **3. Sản phẩm & Giá bán (Products)** | Liệt kê ảnh, tên, xuất xứ, danh mục và giá gốc; Có modal sửa giá bán nhanh cho sản phẩm. | **Lỗi:** Ô tìm kiếm gõ nhưng server chưa lọc; **Thiếu:** Chưa có nút và form tạo sản phẩm mới; Chỉ sửa giá gốc cha, chưa sửa giá biến thể. | **CẦN CẢI THIỆN (6.0/10)**<br>Cần form Thêm sản phẩm và sửa giá biến thể. |
| **4. Điều phối Kho hàng (Inventory)** | Cảnh báo badge đỏ các mặt hàng tồn kho thấp (< 10); Tạo lệnh điều chuyển tồn kho giữa 2 chi nhánh; Tự động ghi nhật ký Audit Log. | Chưa có bộ lọc xem riêng kho của từng cửa hàng cụ thể; Chưa có form nhập lô hàng mới từ nhà cung cấp về kho. | **KHÁ (7.5/10)**<br>Cần thêm lọc theo cửa hàng. |
| **5. Quản lý Chi nhánh (Stores)** | Lọc chi nhánh theo thành phố; Thiết kế công tắc Switch bật/tắt hoạt động cửa hàng. | **Lỗi 404:** Backend ban đầu thiếu route `GET /admin/stores` và `PUT .../status`; Bảng `stores` ban đầu thiếu cột `is_active`. | **LỖI HỆ THỐNG**<br>Đã có giải pháp migration và bổ sung route. |
| **6. Khách hàng & Nhân sự (Users)** | Lọc tài khoản theo vai trò; Hiển thị cửa hàng trực thuộc của nhân viên; Nút Khóa / Mở khóa tài khoản ngay lập tức. | Thanh tìm kiếm chưa được kết nối lọc tại backend; Chưa có nút và form tạo tài khoản nhân viên mới trên giao diện. | **TRUNG BÌNH (6.5/10)**<br>Cần form cấp tài khoản nhân viên mới. |
| **7. Marketing & Ưu đãi (Marketing)** | Tab 1: Sinh hàng loạt Thẻ quà tặng (Gift Card) số lượng lớn; Tab 2: Tạo mã giảm giá (Voucher) có điều kiện đơn tối thiểu. | Chưa có bảng danh sách theo dõi các voucher đang chạy; Chưa có giao diện đăng và quản lý Banner quảng cáo trang chủ. | **KHÁ (7.0/10)**<br>Cần bổ sung bảng voucher & quản lý Banner. |
| **8. Phê duyệt & Đánh giá (Approvals)** | Duyệt hoàn tiền khiếu nại đổi trả (đổi status sang `RETURNED`); Duyệt hiển thị hoặc ẩn đánh giá sản phẩm của khách. | Chưa hiển thị ảnh bằng chứng trái cây dập hỏng khách đính kèm; Thiếu nút từ chối yêu cầu đổi trả kèm lý do. | **TỐT (8.0/10)**<br>Cần thêm hiển thị ảnh bằng chứng đổi trả. |

---

## IV. PHẢN BIỆN CÁC TÍNH NĂNG CÒN THIẾU HOẶC YẾU TRONG TOÀN BỘ HỆ THỐNG

1. **Quản lý Hạn sử dụng & Lô hàng trái cây tươi (Batch & Expiry Date / FIFO)**:
   - Trái cây tươi suy hao nhanh (2 - 7 ngày lưu tủ mát). Cần bảng `inventory_batches` quản lý theo Lô và Hạn dùng.
   - Áp dụng nguyên tắc xuất kho **FIFO (First In, First Out)**: ưu tiên xuất bán lô cũ trước, tự động chặn bán lô đã hết hạn.
   - Cảnh báo hàng cận date (trước 24h - 48h) cho nhân viên chi nhánh để chủ động xả hàng giảm giá.

2. **Tự động hóa thanh toán ngân hàng & Đối soát tự động (Payment Automation)**:
   - Tích hợp Webhook biến động số dư ngân hàng qua **SePay / Casso**: Khách chuyển khoản đúng mã đơn, hệ thống tự động nhận webhook, xác thực HMAC, chuyển đơn sang `paid` và báo nhân viên đóng gói mà không cần kiểm tra app ngân hàng bằng tay.
   - Tích hợp IPN chữ ký số HMAC-SHA512 cho cổng VNPay thật.

3. **Vận chuyển tức thời & Giao hàng hỏa tốc 2 Giờ (On-Demand Logistics)**:
   - Tích hợp API báo giá và tạo chuyến **Ahamove / Lalamove / GrabExpress**: Tự động tính phí vận chuyển theo số km thực tế.
   - Khi đơn hàng chuyển sang `READY`, hệ thống tự động phát lệnh gọi tài xế đến lấy hàng và đồng bộ mã vận đơn để khách theo dõi vị trí tài xế.

4. **Thông báo đẩy & Chăm sóc khách hàng tự động (Omnichannel Notifications)**:
   - Tích hợp **Expo Push Notifications / Firebase Cloud Messaging (FCM)** gửi thông báo lên màn hình khóa điện thoại.
   - Gửi tin nhắn thương hiệu qua **Zalo ZNS / SMS Brandname** kèm link tra cứu tiến trình đơn hàng.

5. **Tiện ích phần cứng bán hàng tại quầy (POS Hardware Support)**:
   - Tích hợp lệnh in hóa đơn nhiệt khổ 58mm / 80mm qua mạng LAN/Wi-Fi (chuẩn ESC/POS).
   - Hỗ trợ quét mã vạch SKU bằng Camera thiết bị hoặc máy quét barcode cổng USB/Bluetooth để chọn sản phẩm vào giỏ hàng siêu tốc.

6. **Đánh giá sản phẩm có xác thực (Verified Buyer)**:
   - Chỉ cho phép khách hàng gửi đánh giá khi tài khoản đó có đơn hàng chứa sản phẩm đã hoàn tất (`COMPLETED`).

---

## V. BẢNG ĐỐI CHIẾU LỖI BẤT ĐỒNG BỘ API (API CONTRACT MISMATCHES)

| Chức năng | Giao diện Mobile gọi | Hợp đồng Server chuẩn hóa | Xử lý đồng bộ |
| :--- | :--- | :--- | :--- |
| **Tạo đơn POS tại quầy** | `POST /v1/staff/pos/checkout` (Body: `customer_phone`, `items: [{variant_id}]`) | `POST /v1/staff/pos/orders` (Body: `customerPhone`, `items: [{variantId}]`) | Server hỗ trợ song song cả 2 URL và chuẩn hóa trường dữ liệu; hỗ trợ thanh toán `cod`/`vietqr`/`vnpay`. |
| **Cập nhật trạng thái đơn** | Gửi chữ thường: `processing`, `delivering` | Enum chuẩn chữ hoa: `PREPARING`, `SHIPPING`, `COMPLETED` | Server tự động ánh xạ: `processing` &rarr; `PREPARING`, `delivering` &rarr; `SHIPPING`. |
| **Danh sách đơn nhân viên** | Đọc `order_code`, `recipient_name`, `shipping_address` | Đọc `code`, `receiver_name`, `receiver_address`, `total` | Đồng bộ tên trường giữa Mobile và Server, hiển thị đầy đủ thông tin khách hàng và số tiền. |
| **Điều chỉnh tồn kho** | `POST .../stock-in` & `POST .../waste` | `POST /v1/staff/inventory/adjust` (Body: `{ variantId, changeQty, type }`) | Server hỗ trợ cả route chuyên biệt cũ lẫn route tổng hợp mới, ghi nhận audit log đầy đủ. |
| **Khách xem đơn hàng** | `GET /v1/orders` | `GET /v1/orders/my-orders` | Server hỗ trợ thêm alias `GET /v1/orders` trỏ về danh sách đơn của user đang đăng nhập. |
| **Khách gửi đổi trả 48H** | `POST /v1/orders/:id/return` | `POST /v1/orders/:id/return-request` | Server nhận cả 2 URL; kiểm tra giới hạn 48 giờ nghiêm ngặt từ thời điểm `COMPLETED`. |
| **Điều chuyển đơn Admin** | `POST /v1/admin/orders/:id/transfer` | `PUT /v1/admin/orders/:id/assign-store` | Server hỗ trợ cả 2 route; chuyển cả số lượng tồn kho đã giữ sang chi nhánh mới an toàn. |
| **Sửa giá sản phẩm Admin** | `PUT /v1/admin/products/:id/price` | `PUT /v1/admin/products/:id` | Server hỗ trợ cả 2 route; tự động cập nhật giá biến thể theo tỷ lệ giá gốc mới. |
| **Quản lý chi nhánh Admin** | `GET /v1/admin/stores` & `PUT .../status` | Cần có route quản trị chuyên biệt | Bổ sung migration thêm cột `is_active` vào bảng `stores`; thêm 2 route quản trị vào `admin.routes.ts`. |
| **Tạo Gift Card hàng loạt** | `POST .../gift-cards/generate` | `POST .../gift-cards/bulk-generate` | Server hỗ trợ cả 2 URL và tự động map các tham số tương ứng. |

---

## VI. LỘ TRÌNH NÂNG CẤP & KHUYẾN NGHỊ VẬN HÀNH (ROADMAP)

1. **Giai đoạn 1: Hoàn thiện tính khả dụng của Trang Quản trị Admin (Ngay lập tức)**
   - Sửa triệt để các route chi nhánh 404 và kích hoạt chức năng tìm kiếm sản phẩm / tài khoản tại backend.
   - Bổ sung **Form Tạo Sản Phẩm Mới (Add Product Modal)**.
   - Bổ sung **Form Cấp Tài Khoản Nhân Viên (Add Staff Modal)**.
   - Bổ sung **Modal Xem Chi Tiết Đơn Hàng Admin** (kèm thông tin xuất hóa đơn VAT).

2. **Giai đoạn 2: Tự động hóa Bán hàng & Vận hành POS Chi nhánh (1 - 2 tháng)**
   - Kết nối máy in hóa đơn nhiệt LAN ESC/POS 58mm/80mm cho quầy thu ngân.
   - Tích hợp Webhook SePay nhận thông báo chuyển khoản ngân hàng tự động.
   - Kích hoạt quản lý tồn kho theo Lô (Batch) và Hạn dùng (Expiry Date) theo nguyên tắc FIFO.

3. **Giai đoạn 3: Tối ưu Logistics & Trải nghiệm Khách hàng (3 - 6 tháng)**
   - Tích hợp API giao hàng Ahamove / GrabExpress tính phí ship thực tế và điều phối tài xế tự động.
   - Cài đặt dịch vụ thông báo đẩy Expo Push Notifications và Zalo ZNS.
   - Bổ sung phân hệ Quản lý Banner & Chiến dịch Flash Sale đếm ngược giờ vàng trên trang Admin.

---

## VII. HƯỚNG DẪN KHỞI CHẠY & KIỂM CHỨNG HỆ THỐNG

1. **Khởi động toàn bộ Web, Mobile và API**:
   - Nhấp đúp vào file **`MO_WEB.cmd`** hoặc chạy lệnh:
     ```powershell
     npm.cmd run web
     ```
   - Script tự bật MySQL XAMPP, chạy backend API tại `http://localhost:4000` và Expo Web tại `http://localhost:8081`.
2. **Chạy kiểm thử storefront chỉ đọc**:
   ```powershell
   node server/src/test-storefront.cjs
   ```
3. **Chạy kiểm thử hợp đồng API (API Contract)**:
   ```powershell
   npm.cmd --prefix server run test:api-contract
   ```
4. **Kiểm tra type checking toàn bộ mã nguồn Mobile**:
   ```powershell
   node mobile/node_modules/typescript/bin/tsc --noEmit -p mobile/tsconfig.json
   ```
