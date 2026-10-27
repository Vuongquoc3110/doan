# Vận hành POS và các tính năng Mục IV

## Đã triển khai trong dự án

| Nhóm | Luồng đã có | Điều kiện để chạy thật |
| --- | --- | --- |
| POS ưu tiên | Quét camera và nhập SKU/máy quét bàn phím; tra chính xác biến thể; khóa tạo đơn lặp bằng Idempotency-Key; hóa đơn LAN ESC/POS 58/80mm; xem tình trạng thu tiền | Máy in mạng và cấu hình theo chi nhánh; cấp quyền camera trên thiết bị |
| Thanh toán | VietQR dùng tài khoản cấu hình, SePay xác thực HMAC-SHA256 hoặc API Key, VNPay tạo URL ký HMAC-SHA512 và nhận IPN, kiểm tra số tiền/phương thức/tài khoản, ghi nhận giao dịch duy nhất | Tài khoản ngân hàng, tài khoản SePay/merchant VNPay, HTTPS webhook/IPN công khai |
| Lô hàng | Mã lô, ngày nhập, hạn dùng, FIFO, phân bổ theo đơn, khôi phục khi hủy, giữ thông tin lô khi điều chuyển; chặn bán lô hết hạn | Nhập mã lô và hạn dùng thực tế cho lần nhập mới |
| Cận hạn | Màn hình kho lọc 24/48 giờ và hàng đã hết hạn; worker xếp cảnh báo push cho nhân viên cùng chi nhánh | Push được kích hoạt nếu muốn nhận ngoài ứng dụng |
| Giao hàng | Báo giá Ahamove v3 theo điểm giao; lưu báo giá 5 phút và xác thực lại khi checkout; hàng READY tạo job điều phối; callback đối chiếu API nhà cung cấp để cập nhật trạng thái/điểm thưởng | Tài khoản đối tác, token, số dư dịch vụ, callback HTTPS và bật worker |
| Thông báo | Đăng ký token theo tài khoản; outbox trong transaction; gửi Expo, kiểm tra receipt và loại token hết hiệu lực; ZNS dùng template theo trạng thái và link tra cứu | EAS project/FCM/APNs, thiết bị thật; ZNS OA/access token/template được duyệt nếu sử dụng ZNS |
| Verified Buyer | Form trong đơn COMPLETED; kiểm tra tài khoản sở hữu đơn và đơn chứa sản phẩm; mỗi sản phẩm/đơn được gửi một lần, chờ duyệt; nhãn Đã mua hàng được tính từ bản ghi xác thực | Không cần nhà cung cấp ngoài |

Không gọi dịch vụ tính phí, gửi thông báo tới khách hay in ra thiết bị thật trong bộ kiểm thử. Bluetooth, Casso, Grab/Lalamove và SMS Brandname chưa được tích hợp; các lựa chọn đã chọn là LAN, SePay, Ahamove, Expo và ZNS.

## Cập nhật cơ sở dữ liệu hiện có

```powershell
npm.cmd --prefix server run build
node server/dist/db/migrate_api_contract.js
node server/dist/db/migrate_operations.js
```

Migration có thể chạy lặp và giữ nguyên dữ liệu. `database.sql` cũng có schema mới cho cài đặt mới bằng Docker. Không reset database để nâng cấp.

Tồn kho lịch sử được gắn lô `LEGACY`, chưa biết hạn dùng. Lô này vẫn được bán để không tự làm mất tồn kho đang vận hành. Người quản lý phải xác minh hạn dùng thực tế qua `PUT /api/v1/staff/inventory/batches/:id/expiry` với `{ expiresAt: ISO8601, note }`. API không cho kéo dài hạn của lô đã được xác minh. Một lô mới cần mã riêng và hạn dùng tương lai; nhập lại cùng mã lô bị từ chối để tránh nhân đôi tồn kho. Sản phẩm tạo mới có tồn kho 0, nhập tồn kho qua luồng lô.

`inventory.qty` là tồn vật lý, bao gồm hàng hết hạn chưa ghi hao hụt. Khâu xuất bán kiểm tra lô còn hạn; màn hình kho hiển thị riêng hàng hết hạn. FIFO ưu tiên ngày nhập, bỏ qua lô hết hạn. Hao hụt cho phép trừ cả lô hết hạn. Các bước cập nhật tồn tổng và tồn lô nằm trong cùng transaction.

## Cấu hình và chạy POS

Tham khảo [server/.env.operations.example](../../server/.env.operations.example), chép các giá trị cần dùng vào `server/.env`, rồi khởi động lại Server. Ví dụ cho chi nhánh 1:

```dotenv
POS_PRINTERS_JSON={"1":{"host":"192.168.1.50","port":9100,"width":80}}
```

Server phải kết nối được tới máy in; điện thoại không gửi TCP trực tiếp. Trong POS, chọn Quét mã vạch / Nhập SKU. Mã phải khớp `product_variants.sku`, ví dụ nhãn Code128 chứa SKU của dự án. Mã EAN của nhà cung cấp chưa được lưu làm SKU sẽ báo không tìm thấy, không tự chọn sản phẩm gần giống.

Sau khi lưu đơn, chọn In hóa đơn. Lệnh in trả `submitted`, nghĩa là đã gửi dữ liệu TCP, không chứng minh giấy đã in. Nếu mất kết nối, trạng thái là `unknown`; phải kiểm tra máy in rồi chọn In lại. Không tự gửi lại lệnh in vì có thể tạo hai bản. Dữ liệu in dùng chữ không dấu để tương thích các bảng mã ESC/POS khác nhau; giao diện vẫn giữ tiếng Việt có dấu.

Thanh toán tiền mặt tạo đơn paid/COMPLETED. VietQR/VNPay tạo đơn unpaid/PENDING, chưa cộng điểm hoàn tất. Webhook/IPN hợp lệ chuyển paid/PREPARING; nhân viên xác nhận bàn giao tại quầy mới COMPLETED và cộng điểm. Không còn nút tự xác nhận tiền vào trên modal POS. Màn hình tự hỏi Server mỗi 3 giây trong lúc chờ tiền.

## Thanh toán và đối soát

SePay: `POST /api/v1/payments/sepay/webhook`. HMAC ký trên timestamp và **raw body**, kiểm tra cửa sổ 5 phút; nếu không cấu hình HMAC thì dùng `Authorization: Apikey ...`. Chỉ nhận tiền vào đúng tài khoản, đúng một mã đơn và đúng số tiền. Chuyển thiếu/thừa, sai phương thức, đơn hủy hoặc không tìm thấy được ghi vào `payment_events`, không tự đổi paid. Admin xem tại `GET /api/v1/payments/events` để đối soát.

VNPay: merchant khai báo IPN tại `GET /api/v1/payments/vnpay/ipn`. Return URL chỉ hiển thị kết quả chờ đối soát, không thay đổi trạng thái. Dùng URL sandbox/production do VNPay cấp qua cấu hình; không có mã merchant hay tài khoản ngân hàng giả trong luồng thanh toán.

Theo [tài liệu SePay](https://developer.sepay.vn/en/sepay-webhooks/xac-thuc) và [VNPay HMAC-SHA512](https://sandbox.vnpayment.vn/apis/docs/chuyen-doi-thuat-toan/changeTypeHash.html).

## Worker, giao hàng và thông báo

Các công tắc mặc định tắt. Chỉ bật `OPERATIONS_WORKER_ENABLED` và từng nhà cung cấp sau khi điền đủ cấu hình, xác nhận hợp đồng/template và kiểm thử sandbox. Worker lưu bền job trong MySQL, có retry/backoff và trạng thái failed để kiểm tra tại `GET /api/v1/admin/operations/jobs`.

Giao hàng dùng [Ahamove báo giá](https://developers.ahamove.com/en/docs/api-reference/order-apis/estimate-order-fee) và [tạo đơn v3](https://developers.ahamove.com/en/docs/api-reference/order-apis/create-order). Checkout yêu cầu báo giá khớp chi nhánh/địa chỉ và còn hạn khi Ahamove được bật. Web mobile hỗ trợ báo giá tới vị trí hiện tại; điện thoại còn hỗ trợ định vị địa chỉ đã nhập. Địa chỉ phải được khách kiểm tra lại trước khi đặt.

READY chỉ tạo một job điều phối cho đơn giao tận nơi. Sau timeout tạo vận đơn, worker tra lại tracking number, không tự đặt thêm chuyến; trường hợp không xác định cần đối soát nhà cung cấp. Callback Ahamove dùng header `apikey` đã cấu hình, sau đó Server gọi API đối tác để xác minh trạng thái. Đơn nhận tại quầy không gọi giao hàng. Hệ thống chưa cam kết SLA giao 2 giờ khi chưa có hợp đồng dịch vụ và thử nghiệm thực địa.

Expo cần thêm `extra.eas.projectId` vào cấu hình ứng dụng, FCM/APNs trong EAS và một development/production build có module camera/notifications. Không thể xác minh push thật chỉ bằng bản web. Xem [Expo Push](https://docs.expo.dev/push-notifications/sending-notifications/) và [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/).

ZNS cần OA/token và mẫu đã được duyệt, map trạng thái sang template ID. Các trường template hiện dùng: `order_code`, `status`, `tracking_url`; điều chỉnh template tương ứng với tài khoản trước khi bật. Không tự sinh template hay gửi SMS dự phòng. API dựa trên [Zalo ZNS](https://stc-developers.zdn.vn/docs/v2/zalo-notification-service/gui-tin-zns/gui-zns-journey); cấu hình Journey riêng nếu OA/template yêu cầu.

## Kiểm thử

```powershell
npm.cmd --prefix server run test:api-contract
node mobile/node_modules/typescript/bin/tsc --noEmit -p mobile/tsconfig.json
```

Bộ HTTP dùng database riêng rồi xóa sau kiểm thử; máy in TCP và Ahamove là dịch vụ giả lập trên localhost. Kiểm tra chữ ký sai, sai số tiền, callback lặp, POS tạo lặp, phân quyền chi nhánh, FIFO/bỏ qua lô hết hạn, khôi phục lô một lần, in 58/80mm, báo giá không khớp, điều phối không trùng, đổi trạng thái giao hàng và Verified Buyer. Camera, giấy in, thông báo trên điện thoại và đối soát ngân hàng thật còn cần nghiệm thu trên thiết bị/tài khoản thực.
