# Chạy và chỉnh giao diện VQ FRUIT

Nhấp đúp `MO_WEB.cmd` ở thư mục gốc, hoặc chạy:

```powershell
npm.cmd run web
```

Script tự bật dịch vụ còn thiếu và mở trình duyệt sau khi kiểm tra sẵn sàng. Khi cần xóa cache Metro, dừng Expo đang chạy rồi dùng:

```powershell
npm.cmd run mobile:web -- --clear
```

Bật MySQL với cấu hình hiện có trong `server/.env`. Không cần import SQL hoặc reset database để xem thay đổi giao diện. Nếu Expo báo cổng đang được dùng, dừng tiến trình Expo trong terminal của nó bằng Ctrl+C trước khi chạy lại. Trên trình duyệt, Ctrl+F5 để tải mới.

## Mã giao diện

- Entry: `mobile/package.json` → `expo-router/entry`.
- Trang chủ: `mobile/app/(customer)/(tabs)/index.tsx`.
- Danh mục và bộ lọc: `mobile/app/(customer)/(tabs)/categories.tsx`.
- Banner tự động: `mobile/src/components/AnimatedFruitBanner.tsx`; đổi ảnh và thời gian trong `SLIDES`, `INTERVAL`.
- Menu cửa hàng: `mobile/src/components/ShopNavigation.tsx`.
- Màu dùng chung: `mobile/src/theme/tokens.ts`.
- Kết nối API và chuẩn hóa ảnh: `mobile/src/api/`, `mobile/src/utils/media.ts`.

Thư mục gốc chỉ điều phối lệnh; không chạy Expo trực tiếp tại đây. Cài đặt, kiểm tra và cấu trúc database được mô tả trong `README.md`Nh?p ??p `MO_WEB.cmd` ? th? m?c g?c, ho?c ch?y `npm.cmd run web`. Script t? b?t d?ch v? c?n thi?u v? m? web sau khi ki?m tra s?n s?ng.

Khi c?n x?a cache Metro: d?ng Expo ?ang ch?y r?i d?ng `npm.cmd run mobile:web -- --clear`. MySQL d?ng d? li?u v? c?u h?nh hi?n c?; kh?ng c?n import SQL hay reset database.

.
