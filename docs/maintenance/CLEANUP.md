# Rà soát và dọn hệ thống không còn dùng — 18/10/2026

## Luồng đang sử dụng

`package.json` gốc điều phối `server/package.json` và `mobile/package.json`. Server chạy `server/src/server.ts` khi phát triển, `server/dist/server.js` sau build; app dùng `expo-router/entry` và `mobile/app/`. Docker và script khởi tạo dùng `server/db/database.sql`.

## Đã loại bỏ

- `backend/`: API JavaScript cổng 3000 thuộc mô hình database trước đây.
- `klever-fruits-app/`: ứng dụng Expo dùng AppEntry và dữ liệu hardcode.
- `database/`: SQL thuộc mô hình cũ, không được setup/Docker hiện tại tham chiếu.
- `mobile/App.js`: giao diện đơn file cũ không được Expo Router sử dụng.
- `server/server.js`: bản sao server JavaScript cũ, không phải entry trong package.
- `setup_klever.js`: hướng dẫn và kiểm tra các thư mục cũ.
- `tsconfig.json` gốc và dependency Expo/React DOM/TypeScript/React types ở gốc: thư mục gốc chỉ điều phối bằng PowerShell, không cần dependency npm. Package và lockfile được cập nhật bằng npm.
- `.expo/` gốc: cache của lần khởi động Expo nhầm thư mục.
- `docs/PROJECT_PROGRESS.md`: báo cáo kế hoạch cũ, có mô tả component và API không tồn tại trong triển khai hiện tại.
- Viết lại README, hướng dẫn giao diện và tài liệu thiết kế theo cấu trúc đang chạy.

Mã nguồn/tài liệu trước khi dọn được lưu trong `.local-backups/archives/legacy-source-before-cleanup.zip` (16 file, đã đối chiếu nội dung). Bản sao SQL trước khi gộp vẫn ở `.local-backups/archives/database-before-merge.zip`. Các ZIP là bản phục hồi cục bộ, không được ứng dụng import hoặc chạy.

## Giữ lại có chủ đích

- Database và dữ liệu hiện tại, `.env`, các route đang được app sử dụng.
- Các cổng nhân viên và quản trị trong `mobile/app`: vẫn là màn hình hoạt động của Expo Router.
- Tên database, mã định danh ứng dụng, slug/scheme, khóa phiên đăng nhập và tên trường API: vẫn là hợp đồng của hệ thống hiện tại.
- Các mapping màu `purple`, `gold`… vẫn được màn hình hiện tại import. Xóa chúng sẽ làm hỏng giao diện.
- `server/db/migrations/`, script sinh dữ liệu, script tạo ảnh và `server/uploads/`: còn phục vụ database/API, không thể kết luận dư chỉ vì không có import trực tiếp.
- `server/test_health.ts`, `server/requests/api.http` và các bài kiểm tra: kiểm tra hệ thống hiện tại.
- `server/dist/`: được tạo lại từ source bằng build và là entry cho npm start.
- Dependency trong mobile/server giữ theo package hiện tại; không tự xóa peer dependency hoặc package được framework nạp động.

## Kết quả kiểm tra

- Build TypeScript server: đạt.
- TypeScript mobile và export web sau khi bỏ dependency gốc: đạt.
- Kiểm tra file SQL và bảo toàn schema khi sinh seed: đạt, không truy cập database.
- API health, categories và stores phản hồi thành công.
- Kiểm thử storefront chưa qua: truy vấn chỉ đọc xác nhận bảng `products` và `product_variants` hiện trống; API vẫn có 18 danh mục và 22 cửa hàng. Không tự nạp lại seed/reset database để làm bài kiểm tra qua.

Đợt dọn này chỉ sửa/xóa file và dependency cục bộ; không chạy SQL khởi tạo hay thay đổi dữ liệu nghiệp vụ. Kiểm tra trực quan qua Computer Use chưa khả dụng vì chưa có trình duyệt kết nối.
