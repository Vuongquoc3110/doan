# VQ FRUIT

Ứng dụng bán trái cây và quà tặng, gồm Expo Router và API Express/MySQL.

## Cấu trúc đang sử dụng

- `mobile/app/`: các màn hình khách hàng, nhân viên và quản trị.
- `mobile/src/`: API client, state, giao diện và tiện ích dùng chung.
- `server/src/`: API, xác thực, nghiệp vụ và script database.
- `server/db/database.sql`: cấu trúc bảng và dữ liệu mẫu trong một file.
- `server/db/migrations/`: các migration cần giữ để bảo trì database.
- `server/uploads/`: tài nguyên được API và dữ liệu sản phẩm tham chiếu.
- `server/dist/`: mã biên dịch để chạy `npm start` trong server.
- `docs/`: tài liệu chia theo `guides/`, `reference/`, `maintenance/`; xem [mục lục](docs/README.md).
- `scripts/`: công cụ khởi động; `server/requests/`: request API mẫu.
- `.local-backups/`: bản sao dữ liệu và ZIP phục hồi; `.local-logs/`: log khởi động.

Thư mục gốc chỉ điều phối lệnh; ứng dụng Expo nằm trong `mobile/`.

## Cài đặt và chạy

Yêu cầu Node.js phù hợp với Expo SDK hiện tại và MySQL/MariaDB. Các dependency cụ thể được khóa trong từng `package-lock.json`.

```powershell
npm.cmd --prefix server ci
npm.cmd --prefix mobile ci
```

Nhấp đúp **`MO_WEB.cmd`** hoặc chạy tại thư mục gốc:

```powershell
npm.cmd run web
```

Script tự bật MySQL XAMPP, API và Expo từ `mobile/`, kiểm tra sẵn sàng rồi mở `http://localhost:8081`. Cấu hình API/database nằm trong `server/.env`, theo `server/.env.example`. Nếu XAMPP nằm ngoài `D:/XAMPP` hoặc `C:/xampp`, đặt biến `VQ_XAMPP_HOME`.

Chạy Expo Go riêng bằng `npm.cmd run mobile:dev`; chạy API riêng bằng `npm.cmd run server:dev`. Thư mục gốc không cần cài dependency npm; không chạy Expo trực tiếp tại đây.

Với database hiện có, giữ nguyên cấu hình kết nối. Chỉ khi chủ đích khởi tạo lại dữ liệu mẫu mới chạy `npm.cmd run db:setup`; script có lệnh xóa bảng và nạp dữ liệu lại. Xem `server/db/README.md`.

## Kiểm tra

```powershell
npm.cmd --prefix server run build
node mobile/node_modules/typescript/bin/tsc --noEmit -p mobile/tsconfig.json
node server/src/db/database_file.test.cjs
node server/src/test-storefront.cjs
```

Kiểm tra storefront cần API và MySQL đang chạy; chỉ đọc dữ liệu. Kiểm tra file SQL không kết nối database. Bộ `test:e2e` thực hiện nghiệp vụ có thay đổi dữ liệu, chỉ chạy với môi trường kiểm thử thích hợp.

## Tương thích

Tên database `klever_fruits_db`, slug/scheme ứng dụng, các khóa lưu phiên `@klever_*` và tên dữ liệu đang tồn tại được giữ để bảo toàn liên kết và phiên đăng nhập. Chúng thuộc luồng hiện tại; đổi chúng cần một migration riêng.

Tính năng và giới hạn tích hợp được ghi trong `docs/reference/DOI_CHIEU_TINH_NANG_KLEVER.md`. Kết quả dọn mã không dùng nằm ở `docs/maintenance/CLEANUP.md`.
