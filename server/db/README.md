# Database SQL

`database.sql` là file SQL duy nhất để khởi tạo cấu trúc bảng và dữ liệu mẫu. Cấu trúc nằm trước dòng `-- === VQ_FRUIT_SEED_DATA ===`; dữ liệu mẫu nằm sau dòng này. Giữ nguyên dòng phân cách để script sinh dữ liệu có thể bảo toàn cấu trúc.

- `npm run db:setup` ở thư mục gốc vẫn áp dụng schema, tạo ảnh mẫu, sinh lại dữ liệu mẫu và nạp dữ liệu theo thứ tự như trước.
- Chạy trực tiếp script `server/src/db/seed_generator.ts` chỉ cập nhật phần seed trong `database.sql`, không kết nối database.
- Docker dùng duy nhất `database.sql` khi khởi tạo volume MySQL mới; dữ liệu trên volume hiện có không bị nhập lại.
- Thư mục `migrations/` được giữ nguyên.

File có các lệnh xóa bảng và nạp lại dữ liệu mẫu. Chỉ dùng để dựng mới/reset database có chủ đích; không import lại trên database cần giữ dữ liệu.

Bản sao ba file trước khi gộp nằm ở `.local-backups/archives/database-before-merge.zip`. File seed phụ trước đây không được các script hiện tại dùng nên chỉ lưu trong bản sao, không nạp lặp vào SQL gộp.

Kiểm tra không truy cập database: từ thư mục `server`, chạy `npm run build` rồi `node src/db/database_file.test.cjs`.
