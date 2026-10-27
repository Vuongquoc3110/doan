# Đồng bộ API Mobile – Server (Mục III)

Các URL dưới đây có tiền tố `/api` trên Server và dùng trực tiếp sau baseURL `/api` trên Mobile. Response giữ dạng `{ success, message, data, meta? }`.

| Luồng | Hợp đồng chuẩn đang dùng |
| --- | --- |
| POS | `POST /v1/staff/pos/orders`: `{ customerPhone?, paymentMethod: 'cod'|'vietqr'|'vnpay', pointsToUse?, items: [{ variantId, qty }] }`; trả `{ orderId, orderCode, total }` |
| Danh sách đơn nhân viên | `GET /v1/staff/orders?status=PENDING`; trường `code`, `receiver_name`, `receiver_phone`, `receiver_address`, `delivery_slot`, `greeting_message`, `total`, `items` |
| Chuyển trạng thái | `PUT /v1/staff/orders/:id/status`: `{ status, note? }`; enum chữ hoa bên dưới |
| Nhập kho / hao hụt | `POST /v1/staff/inventory/adjust`: `{ variantId, changeQty: số nguyên dương, type: 'import'|'waste', reason? }`; tồn kho đọc trường `qty` |
| Nhân viên xử lý đổi trả | `PUT /v1/staff/returns/:id`: `{ status: 'approved'|'rejected', resolution: 'exchange'|'refund', note? }`; kiểm tra chi nhánh và khóa bản ghi trong transaction |
| Khách xem đơn | `GET /v1/orders/my-orders`; lọc `status` chữ hoa; trường đơn giống danh sách nhân viên |
| Chi tiết đơn | `GET /v1/orders/:id`; timeline `history`, quyền gửi đổi trả `canReturn` (boolean), ảnh từng dòng `thumbnail`, tổng dòng `total_price` |
| Khách gửi đổi trả | `POST /v1/orders/:id/return-request`: `{ reason, images: string[] }`; Mobile tải ảnh lên `/v1/upload/image` trước, gửi URL máy chủ thay cho URI thiết bị |
| Điều chuyển đơn | `PUT /v1/admin/orders/:id/assign-store`: `{ newStoreId, reason? }`; chuyển cả tồn kho đã giữ cho đơn, rollback nếu chi nhánh đích thiếu hàng |
| Sửa giá | `PUT /v1/admin/products/:id`: `{ base_price }`; cập nhật giá biến thể theo tỷ lệ giá cũ, transaction với giá sản phẩm |
| Quản lý chi nhánh | `GET /v1/admin/stores?city=...`; `PUT /v1/admin/stores/:id/status`: `{ is_active: boolean }` |
| Gift Card | `POST /v1/admin/gift-cards/bulk-generate`: `{ count, balance, daysValid?, prefix? }`; trả `{ count, codes: string[] }` |
| Voucher | `POST /v1/admin/coupons`: `{ code, type: 'fixed'|'percent', value, min_order?, max_uses?, expires_at }` |

Enum đơn hàng: `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `SHIPPING`, `COMPLETED`, `CANCELLED`, `RETURNED`. Trạng thái đổi trả riêng: `pending`, `approved`, `rejected`. Thanh toán riêng: `unpaid`, `paid`, `refunded`.

Server còn nhận các URL cũ `/staff/pos/checkout`, `/staff/inventory/stock-in`, `/staff/inventory/waste`, `/orders`, `/orders/:id/return`, `/admin/orders/:id/transfer`, `/admin/products/:id/price`, `/admin/gift-cards/generate`. Các payload cũ tương ứng được chuyển về cùng một handler. `processing` ánh xạ `PREPARING`, `delivering` ánh xạ `SHIPPING`; Mobile mới gửi enum chuẩn. Trường thanh toán POS cũ `cash` ánh xạ `cod`.

POS phải lấy ID biến thể từ chi tiết sản phẩm; ID sản phẩm không thay thế được ID biến thể. Một điểm thành viên tương ứng 1.000 đồng; Server kiểm tra và trừ điểm trong transaction.

Đơn đã kết thúc không được mở lại bằng route cập nhật trạng thái. Gửi lặp cùng trạng thái không hoàn kho hoặc cộng điểm thêm. Đơn nhận tại quầy chuyển từ khâu chuẩn bị sang `COMPLETED`, không chuyển sang `SHIPPING`. Quyết định đổi trả chỉ áp dụng một lần; đổi hàng giữ trạng thái thanh toán, hoàn tiền đặt `refunded` theo mô hình hiện có của ứng dụng (không tích hợp chuyển khoản ngân hàng).

Chi nhánh tạm dừng bị loại khỏi danh sách công khai, tìm cửa hàng gần nhất, đặt đơn mới và điều chuyển đơn. Dữ liệu, tài khoản và đơn hàng cũ được giữ nguyên.

## Cập nhật cơ sở dữ liệu

Schema mới có `stores.is_active` mặc định 1. Với cơ sở dữ liệu đã tồn tại, chạy từ thư mục dự án:

```powershell
npm.cmd --prefix server run build
node server/dist/db/migrate_api_contract.js
```

Migration chỉ thêm cột nếu thiếu, có thể chạy lặp. Không chạy `db:setup` hoặc reset dữ liệu cho thay đổi này.

## Kiểm tra

```powershell
npm.cmd --prefix server run test:api-contract
node mobile/node_modules/typescript/bin/tsc --noEmit -p mobile/tsconfig.json
```

Kiểm thử HTTP tạo cơ sở dữ liệu riêng với tên `klever_api_test_<pid>_<timestamp>`, kiểm tra route thật và transaction trên MySQL, rồi xóa cơ sở dữ liệu kiểm thử. Không dùng dữ liệu vận hành để tạo đơn thử. Bao gồm các hợp đồng chuẩn và route cũ, kiểm tra phân quyền, payload sai, điểm thưởng, hủy lặp, đổi/hoàn tiền, tồn kho khi điều chuyển, chi nhánh tạm dừng, giá biến thể, Gift Card và Voucher.
