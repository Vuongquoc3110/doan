# Sắp xếp thư mục — 18/10/2026

## Thư mục chính

| Đường dẫn | Nội dung |
| --- | --- |
| `mobile/app/` | Màn hình Expo Router: khách hàng, xác thực, nhân viên, quản trị |
| `mobile/src/` | Component, state, API client, theme và tiện ích |
| `server/src/` | API Express, nghiệp vụ, database và kiểm tra hiện có |
| `server/db/` | SQL chính, migrations và hướng dẫn database |
| `server/uploads/` | Ảnh và tài nguyên đang dùng |
| `server/requests/` | Request HTTP để kiểm tra API thủ công |
| `scripts/` | Script điều phối khởi động |
| `docs/` | Hướng dẫn, tham chiếu và bảo trì |
| `.local-backups/` | Bản sao dữ liệu và ZIP phục hồi lịch sử |
| `.local-logs/` | Log khởi động API/web |

## Đã dọn

- Bỏ các dependency gốc không còn được script điều phối sử dụng: Expo, React DOM, TypeScript, React types, concurrently; cập nhật lockfile bằng npm offline.
- Xóa `node_modules/` gốc và `tsconfig.json` gốc. `mobile/` và `server/` có package, lockfile và tsconfig riêng.
- Xóa `.expo/` gốc do chạy nhầm Expo và bản export kiểm tra `mobile/.web-check/`; đều là dữ liệu sinh lại được.
- Gom tài liệu vào `guides/`, `reference/`, `maintenance/`; chuyển ZIP phục hồi sang `.local-backups/archives/`.
- Chuyển request mẫu sang `server/requests/api.http`.
- Ẩn dependency, cache, build, log và backup trong Explorer/tìm kiếm VS Code. Có thể xem bằng cách tắt các mục trong `.vscode/settings.json`.

Giữ nguyên mã nguồn ứng dụng, dữ liệu MySQL, `.env`, ảnh uploads và toàn bộ bản sao lưu. Giữ `server/dist/` vì `server/npm start` sử dụng bản build. Không di chuyển cấu trúc route Expo hoặc sửa nội dung thư viện trong `node_modules` của các ứng dụng.

`app.config.js` gốc chỉ chặn chạy Expo sai thư mục. Mở `MO_WEB.cmd` hoặc chạy `npm run web` để khởi động hệ thống.

## Kiểm tra sau khi dọn

- Build TypeScript server và kiểm tra TypeScript mobile: đạt.
- Export web với cache sạch sau khi xóa dependency gốc: đạt, 1042 module.
- Kiểm tra cấu trúc file SQL và storefront chỉ đọc: đạt.
- Script mở web chạy với `-NoBrowser`: API/database và bundle web sẵn sàng tại cổng 8081.
- Bản export dùng để kiểm tra đã xóa sau khi hoàn tất.
