import { catalogProducts, catalogImage } from './product_catalog';
import { generateProductSvg } from '../scripts/generate_sample_images';
import fs from 'fs';
import path from 'path';
import { DATABASE_SQL_PATH, readDatabaseSql, writeDatabaseSql } from './database_file';
import { saleLabels } from '../utils/sale-units';

const BCRYPT_HASH = '$2a$10$8/CeBPfnh9nn3H8cjhSJLua1o7I5PqaFLFpu42RfAnIHa7A8hZUQ6'; // Local demo password: 1

export function generateSeedSql(): string {
  let sql = `-- ==============================================================================
-- KLEVER FRUIT SEED DATA (156+ SẢN PHẨM MẪU & 10 BANNERS ĐỘNG CHUẨN MỰC)
-- Đảm bảo đầy đủ 18 danh mục, tồn kho 22 cửa hàng, đa dạng quy cách biến thể
-- ==============================================================================
USE \`klever_fruits_db\`;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS
TRUNCATE TABLE \`users\`;
INSERT INTO \`users\` (\`id\`, \`phone\`, \`email\`, \`password_hash\`, \`full_name\`, \`role\`, \`avatar\`, \`status\`, \`created_at\`) VALUES
(1, '0900000001', 'admin@kleverjuice.com.vn', '${BCRYPT_HASH}', 'Quản Trị Viên Klever', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', 'active', NOW() - INTERVAL 90 DAY),
(2, '0900000002', 'staff1@kleverjuice.com.vn', '${BCRYPT_HASH}', 'Trần Thị Thu Thảo (Yên Lãng)', 'staff', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200', 'active', NOW() - INTERVAL 80 DAY),
(3, '0900000003', 'staff2@kleverjuice.com.vn', '${BCRYPT_HASH}', 'Nguyễn Văn Minh (Phan Đình Phùng)', 'staff', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', 'active', NOW() - INTERVAL 75 DAY),
(4, '0900000011', 'hoanganh@gmail.com', '${BCRYPT_HASH}', 'Hoàng Tuấn Anh', 'customer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', 'active', NOW() - INTERVAL 60 DAY),
(5, '0900000012', 'phuonglinh@gmail.com', '${BCRYPT_HASH}', 'Vũ Phương Linh', 'customer', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', 'active', NOW() - INTERVAL 50 DAY),
(6, '0900000013', 'dangquang@gmail.com', '${BCRYPT_HASH}', 'Lê Đăng Quang', 'customer', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200', 'active', NOW() - INTERVAL 45 DAY),
(7, '0900000014', 'maithao@gmail.com', '${BCRYPT_HASH}', 'Phạm Mai Thảo', 'customer', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', 'active', NOW() - INTERVAL 30 DAY),
(8, '0900000015', 'trunghieu@gmail.com', '${BCRYPT_HASH}', 'Đỗ Trung Hiếu', 'customer', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200', 'active', NOW() - INTERVAL 20 DAY);

-- 2. CUSTOMER PROFILES
TRUNCATE TABLE \`customer_profiles\`;
INSERT INTO \`customer_profiles\` (\`user_id\`, \`tier\`, \`points\`) VALUES
(4, 'diamond', 12500),
(5, 'gold', 6800),
(6, 'silver', 2400),
(7, 'bronze', 850),
(8, 'bronze', 200);

-- 3. STAFF PROFILES
TRUNCATE TABLE \`staff_profiles\`;
INSERT INTO \`staff_profiles\` (\`user_id\`, \`store_id\`, \`position\`) VALUES
(2, 1, 'Cửa hàng trưởng - 63 Yên Lãng'),
(3, 2, 'Cửa hàng phó - 31B Phan Đình Phùng');

-- 4. ADDRESSES
TRUNCATE TABLE \`addresses\`;
INSERT INTO \`addresses\` (\`id\`, \`user_id\`, \`receiver\`, \`phone\`, \`province\`, \`district\`, \`ward\`, \`detail\`, \`is_default\`) VALUES
(1, 4, 'Hoàng Tuấn Anh', '0900000011', 'Hà Nội', 'Đống Đa', 'Láng Hạ', 'Số 15, Ngõ 102 Hoàng Cầu', 1),
(2, 4, 'Hoàng Tuấn Anh (Cơ quan)', '0900000011', 'Hà Nội', 'Ba Đình', 'Kim Mã', 'Tòa nhà Lotte Center Liễu Giai, Tầng 18', 0),
(3, 5, 'Vũ Phương Linh', '0900000012', 'Hà Nội', 'Cầu Giấy', 'Dịch Vọng Hậu', 'P1204 Chung cư Discovery Complex, 302 Cầu Giấy', 1),
(4, 6, 'Lê Đăng Quang', '0900000013', 'Hà Nội', 'Hai Bà Trưng', 'Vĩnh Tuy', 'Park 8 Tầng 22, Vinhomes Times City', 1),
(5, 7, 'Phạm Mai Thảo', '0900000014', 'Hồ Chí Minh', 'Quận 3', 'Phường 6', '45 Tú Xương', 1),
(6, 8, 'Đỗ Trung Hiếu', '0900000015', 'Hà Nội', 'Hoàn Kiếm', 'Tràng Tiền', '88 Tràng Tiền Plaza', 1);

-- 5. STORES (22 CHI NHÁNH CHUỖI BÁN LẺ CAO CẤP HÀ NỘI & TP.HCM)
TRUNCATE TABLE \`stores\`;
INSERT INTO \`stores\` (\`id\`, \`name\`, \`address\`, \`district\`, \`city\`, \`lat\`, \`lng\`, \`phone\`, \`open_hours\`, \`ship_fee_rules\`) VALUES
(1, 'Klever Fruit 63 Yên Lãng', '63 Yên Lãng, Thịnh Quang', 'Đống Đa', 'Hà Nội', 21.0116000, 105.8182000, '024 3858 9988', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(2, 'Klever Fruit 31B Phan Đình Phùng', '31B Phan Đình Phùng, Quán Thánh', 'Ba Đình', 'Hà Nội', 21.0402000, 105.8436000, '024 3735 0058', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(3, 'Klever Fruit 79 Trần Đăng Ninh', '79 Trần Đăng Ninh, Dịch Vọng', 'Cầu Giấy', 'Hà Nội', 21.0378000, 105.7932000, '024 3839 8899', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(4, 'Klever Fruit 276 Kim Ngưu', '276 Kim Ngưu, Thanh Lương', 'Hai Bà Trưng', 'Hà Nội', 21.0062000, 105.8617000, '024 3636 9988', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(5, 'Klever Fruit 381 Quang Trung', '381 Quang Trung, Quang Trung', 'Hà Đông', 'Hà Nội', 20.9678000, 105.7725000, '024 3352 8899', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(6, 'Klever Fruit 182 Nguyễn Văn Cừ', '182 Nguyễn Văn Cừ, Bồ Đề', 'Long Biên', 'Hà Nội', 21.0435000, 105.8721000, '024 3872 9988', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(7, 'Klever Fruit 32A Nguyễn Chí Thanh', '32A Nguyễn Chí Thanh, Ngọc Khánh', 'Ba Đình', 'Hà Nội', 21.0258000, 105.8142000, '024 3724 6688', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(8, 'Klever Fruit 28 Trần Duy Hưng', '28 Trần Duy Hưng, Trung Hòa', 'Cầu Giấy', 'Hà Nội', 21.0094000, 105.8015000, '024 3783 5599', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(9, 'Klever Fruit 50 Lý Thường Kiệt', '50 Lý Thường Kiệt, Trần Hưng Đạo', 'Hoàn Kiếm', 'Hà Nội', 21.0245000, 105.8495000, '024 3936 8899', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(10, 'Klever Fruit 253 Lạc Long Quân', '253 Lạc Long Quân, Nghĩa Đô', 'Tây Hồ', 'Hà Nội', 21.0562000, 105.8089000, '024 3759 2288', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(11, 'Klever Fruit 101 Láng Hạ', '101 Láng Hạ, Láng Hạ', 'Đống Đa', 'Hà Nội', 21.0148000, 105.8135000, '024 3562 7788', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(12, 'Klever Fruit Times City', 'Tòa T6 Mega Mall Times City, 458 Minh Khai', 'Hai Bà Trưng', 'Hà Nội', 20.9958000, 105.8682000, '024 3200 6699', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(13, 'Klever Fruit Vinhomes Ocean Park', 'Shophouse S2.01 Vinhomes Ocean Park', 'Gia Lâm', 'Hà Nội', 20.9912000, 105.9421000, '024 3998 7766', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(14, 'Klever Fruit 482 Quang Trung (HCM)', '482 Quang Trung, Phường 10', 'Gò Vấp', 'Hồ Chí Minh', 10.8324000, 106.6668000, '028 3989 9988', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(15, 'Klever Fruit 216 Phan Đình Phùng (HCM)', '216 Phan Đình Phùng, Phường 2', 'Phú Nhuận', 'Hồ Chí Minh', 10.7965000, 106.6842000, '028 3995 8899', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(16, 'Klever Fruit 215 Xô Viết Nghệ Tĩnh (HCM)', '215 Xô Viết Nghệ Tĩnh, Phường 17', 'Bình Thạnh', 'Hồ Chí Minh', 10.7978000, 106.7092000, '028 3840 9988', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(17, 'Klever Fruit 169 Nguyễn Văn Cừ (HCM)', '169 Nguyễn Văn Cừ, Phường 2', 'Quận 5', 'Hồ Chí Minh', 10.7589000, 106.6834000, '028 3830 8899', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(18, 'Klever Fruit 207B Lê Văn Sỹ (HCM)', '207B Lê Văn Sỹ, Phường 13', 'Quận 3', 'Hồ Chí Minh', 10.7892000, 106.6748000, '028 3931 7788', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(19, 'Klever Fruit 518 Lý Thái Tổ (HCM)', '518 Lý Thái Tổ, Phường 10', 'Quận 10', 'Hồ Chí Minh', 10.7674000, 106.6695000, '028 3868 9988', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(20, 'Klever Fruit 161 Khánh Hội (HCM)', '161 Khánh Hội, Phường 3', 'Quận 4', 'Hồ Chí Minh', 10.7582000, 106.7012000, '028 3943 8899', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(21, 'Klever Fruit 86 Nguyễn Thị Thập (HCM)', '86 Nguyễn Thị Thập, Tân Hưng', 'Quận 7', 'Hồ Chí Minh', 10.7412000, 106.7045000, '028 3775 8899', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}'),
(22, 'Klever Fruit Vinhomes Grand Park (HCM)', 'Shophouse S5.01 Vinhomes Grand Park', 'Thủ Đức', 'Hồ Chí Minh', 10.8492000, 106.8423000, '028 3991 6688', '07:00 - 22:00', '{"baseFee": 25000, "freeShipMin": 500000, "sameDistrictFee": 20000, "diffDistrictFee": 35000}');

-- 6. CATEGORIES (18 DANH MỤC ĐẦY ĐỦ CỦA TOÀN HỆ THỐNG)
TRUNCATE TABLE \`categories\`;
INSERT INTO \`categories\` (\`id\`, \`parent_id\`, \`name\`, \`slug\`, \`sort\`) VALUES
(1, NULL, 'Quà Tặng 20/10', 'qua-tang-20-10', 1),
(2, NULL, 'Giỏ & Hộp Quà Lễ Tết', 'gio-qua-le-tet', 2),
(3, NULL, 'Quà Theo Người Nhận & Đối Tác', 'qua-theo-nguoi-nhan', 3),
(4, NULL, 'Cherry Nhập Khẩu', 'cherry', 4),
(5, NULL, 'Nho Nhập Khẩu & Nho Mẫu Đơn', 'nho', 5),
(6, NULL, 'Táo Thượng Hạng', 'tao', 6),
(7, NULL, 'Lê Hàn & Lê Nhật Bản', 'le', 7),
(8, NULL, 'Dâu Tây & Quả Mọng', 'dau-tay-qua-mong', 8),
(9, NULL, 'Việt Quất Tươi', 'viet-quat', 9),
(10, NULL, 'Kiwi New Zealand', 'kiwi', 10),
(11, NULL, 'Mận & Xuân Đào', 'man-xuan-dao', 11),
(12, NULL, 'Cam Quýt Ngoại Nhập', 'cam-quyt', 12),
(13, NULL, 'Trái Cây Đặc Sản Việt Nam', 'trai-cay-viet-nam', 13),
(14, NULL, 'Trái Cây Cắt Sẵn Tiện Lợi', 'trai-cay-cat-san', 14),
(15, NULL, 'Nước Ép & Đồ Uống Tươi', 'do-uong', 15),
(16, NULL, 'Gift Card Thẻ Quà Tặng', 'gift-card', 16),
(17, NULL, 'Combo Vitamin Gia Đình 3 - 5 Người', 'vitamin-gia-dinh', 17),
(18, NULL, 'Hồng Giòn & Trái Cây Mùa Vụ', 'hong-gion-trai-cay-mua-vu', 18);

-- 7. COLLECTIONS
TRUNCATE TABLE \`collections\`;
INSERT INTO \`collections\` (\`id\`, \`name\`, \`slug\`, \`type\`, \`banner\`, \`start_at\`, \`end_at\`) VALUES
(1, 'Bộ Sưu Tập Phồn Hoa 20/10', 'bst-phon-hoa-20-10', 'occasion', '/uploads/banners/banner_2_web.svg', NOW() - INTERVAL 10 DAY, NOW() + INTERVAL 20 DAY),
(2, 'Quà Tặng Sinh Nhật Sang Trọng', 'qua-tang-sinh-nhat', 'occasion', '/uploads/banners/banner_1_web.svg', NULL, NULL),
(3, 'Thăm Hỏi & Chúc Sức Khỏe', 'tham-hoi-suc-khoe', 'occasion', '/uploads/banners/banner_4_web.svg', NULL, NULL),
(4, 'Quà Biếu Tết & Dâng Lễ Cung Đình', 'dang-le-ta-on', 'occasion', '/uploads/banners/banner_2_web.svg', NULL, NULL),
(5, 'Quà Tặng Doanh Nghiệp VIP', 'qua-tang-doanh-nghiep', 'recipient', '/uploads/banners/banner_1_web.svg', NULL, NULL),
(6, 'Best Seller - Trái Cây Bán Chạy Nhất', 'best-seller', 'product', '/uploads/banners/banner_3_web.svg', NULL, NULL),
(7, 'Đường Bay VIP - Nhập Khẩu Tươi Mới 24H', 'duong-bay-vip', 'product', '/uploads/banners/banner_1_web.svg', NULL, NULL),
(8, 'Sống Lành Mỗi Ngày', 'song-lanh-moi-ngay', 'product', '/uploads/banners/banner_4_web.svg', NULL, NULL);
`;

  // ==========================================
  // 8. GENERATE 156 REALISTIC PRODUCTS
  // ==========================================
  const rawProducts = getSeedProducts();
  sql += `\n-- 8. PRODUCTS (156 SẢN PHẨM MẪU)\nTRUNCATE TABLE \`products\`;\n`;
  const productRows = rawProducts.map((p) => {
    const cmpVal = p.cmp ? p.cmp : 'NULL';
    const escapedDesc = p.desc.replace(/'/g, "''");
    const escapedName = p.name.replace(/'/g, "''");
    return `(${p.id}, '${escapedName}', '${p.slug}', '${escapedDesc}', '${p.origin}', ${p.price}, ${cmpVal}, ${p.disc}, ${p.cat}, ${p.isGift}, '${catalogImage(p.slug) ? 'active' : 'inactive'}', NOW() - INTERVAL ${p.id} DAY)`;
  });
  sql += `INSERT INTO \`products\` (\`id\`, \`name\`, \`slug\`, \`description\`, \`origin\`, \`base_price\`, \`compare_price\`, \`discount_percent\`, \`category_id\`, \`is_gift\`, \`status\`, \`created_at\`) VALUES\n` + productRows.join(',\n') + ';\n';

  // ==========================================
  // 9. PRODUCT VARIANTS (1 - 3 BIẾN THỂ CHO MỖI SẢN PHẨM)
  // ==========================================
  sql += `\n-- 9. PRODUCT VARIANTS\nTRUNCATE TABLE \`product_variants\`;\n`;
  const variantRows: string[] = [];
  let variantIdCounter = 1;

  for (const p of rawProducts) {
    const labels = saleLabels({ name: p.name, isGift: p.isGift, categoryId: p.cat });
    if (p.isGift) {
      variantRows.push(`(${variantIdCounter++}, ${p.id}, '${labels[0]}', ${p.price}, 'SKU-${p.id}-M')`);
      variantRows.push(`(${variantIdCounter++}, ${p.id}, '${labels[1]}', ${Math.round(p.price * 1.35)}, 'SKU-${p.id}-L')`);
    } else if (p.cat === 16) {
      // Gift card
      variantRows.push(`(${variantIdCounter++}, ${p.id}, '${labels[0]}', ${p.price}, 'GC-${p.id}-E')`);
      variantRows.push(`(${variantIdCounter++}, ${p.id}, '${labels[1]}', ${p.price + 50000}, 'GC-${p.id}-VIP')`);
    } else {
      variantRows.push(`(${variantIdCounter++}, ${p.id}, '${labels[0]}', ${p.price}, 'SKU-${p.id}-1KG')`);
      variantRows.push(`(${variantIdCounter++}, ${p.id}, '${labels[1]}', ${Math.round(p.price * 3.8)}, 'SKU-${p.id}-THUNG')`);
    }
  }
  sql += `INSERT INTO \`product_variants\` (\`id\`, \`product_id\`, \`label\`, \`price\`, \`sku\`) VALUES\n` + variantRows.join(',\n') + ';\n';

  // ==========================================
  // 10. PRODUCT IMAGES (KẾT HỢP VECTOR NỘI BỘ VÀ ẢNH THẬT ĐƯỜNG BAY)
  // ==========================================
  sql += `\n-- 10. PRODUCT IMAGES\nTRUNCATE TABLE \`product_images\`;\n`;
  const imageRows: string[] = [];
  let imageIdCounter = 1;

  for (const p of rawProducts) {
    const image = catalogImage(p.slug);
    if (!image) {
      const dir = path.join(__dirname, '../../uploads/products');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, p.slug + '.svg'), generateProductSvg(p.name, '?nh minh h?a s?n ph?m', p.origin, p.emoji, '#2E7D32'), 'utf8');
    }
    imageRows.push(`(${imageIdCounter++}, ${p.id}, '${image || '/uploads/products/' + p.slug + '.svg'}', 1)`);
  }
  sql += `INSERT INTO \`product_images\` (\`id\`, \`product_id\`, \`url\`, \`sort\`) VALUES\n` + imageRows.join(',\n') + ';\n';

  // ==========================================
  // 11. PRODUCT COLLECTIONS
  // ==========================================
  sql += `\n-- 11. PRODUCT COLLECTIONS\nTRUNCATE TABLE \`product_collections\`;\n`;
  const colRows: string[] = [];
  for (const p of rawProducts) {
    if (p.cat === 1) colRows.push(`(${p.id}, 1)`);
    if (p.isGift) colRows.push(`(${p.id}, 5)`);
    if (p.disc >= 14) colRows.push(`(${p.id}, 6)`); // Best sellers
    if ([4, 5, 8, 9].includes(p.cat)) colRows.push(`(${p.id}, 7)`); // Đường bay VIP
    if (p.cat === 17) colRows.push(`(${p.id}, 8)`); // Sống lành
  }
  sql += `INSERT INTO \`product_collections\` (\`product_id\`, \`collection_id\`) VALUES\n` + colRows.join(',\n') + ';\n';

  // ==========================================
  // 12. INVENTORY (22 CỬA HÀNG X TOÀN BỘ BIẾN THỂ)
  // Đảm bảo có một số sản phẩm tồn = 0 tại các cửa hàng để kiểm thử trạng thái "Hết hàng"
  // ==========================================
  sql += `\n-- 12. INVENTORY (TỒN KHO THEO CỬA HÀNG)\nTRUNCATE TABLE \`inventory\`;\n`;
  const inventoryRows: string[] = [];
  const totalVariants = variantIdCounter - 1;

  for (let storeId = 1; storeId <= 22; storeId++) {
    for (let vId = 1; vId <= totalVariants; vId++) {
      // Điều kiện giả lập hết hàng có chủ đích (khoảng 6% biến thể tồn = 0)
      const isOutOfStock = (storeId * 7 + vId * 3) % 17 === 0;
      const qty = isOutOfStock ? 0 : Math.floor(8 + ((storeId + vId) % 35));
      inventoryRows.push(`(${storeId}, ${vId}, ${qty})`);
    }
  }

  const INVENTORY_CHUNK_SIZE = 500;
  for (let i = 0; i < inventoryRows.length; i += INVENTORY_CHUNK_SIZE) {
    const chunk = inventoryRows.slice(i, i + INVENTORY_CHUNK_SIZE);
    sql += `INSERT INTO \`inventory\` (\`store_id\`, \`variant_id\`, \`qty\`) VALUES\n` + chunk.join(',\n') + ';\n';
  }

  // ==========================================
  // 13. COUPONS & GIFT CARDS
  // ==========================================
  sql += `\n-- 13. COUPONS & GIFT CARDS
TRUNCATE TABLE \`coupons\`;
INSERT INTO \`coupons\` (\`code\`, \`type\`, \`value\`, \`min_order\`, \`max_uses\`, \`used\`, \`expires_at\`) VALUES
('KLEVER2010', 'percent', 10, 1000000, 500, 48, NOW() + INTERVAL 30 DAY),
('CHERRYVIP', 'fixed', 100000, 1500000, 200, 15, NOW() + INTERVAL 60 DAY),
('FREESHIP', 'fixed', 25000, 500000, 1000, 120, NOW() + INTERVAL 90 DAY),
('KLEVER50K', 'fixed', 50000, 800000, 500, 89, NOW() + INTERVAL 30 DAY),
('DIAMONDVIP', 'percent', 15, 2000000, 50, 12, NOW() + INTERVAL 120 DAY);

TRUNCATE TABLE \`gift_cards\`;
INSERT INTO \`gift_cards\` (\`code\`, \`balance\`, \`status\`, \`expires_at\`) VALUES
('KFGC-8888-9999-0001', 500000, 'active', NOW() + INTERVAL 180 DAY),
('KFGC-8888-9999-0002', 1000000, 'active', NOW() + INTERVAL 180 DAY),
('KFGC-8888-9999-0003', 2000000, 'active', NOW() + INTERVAL 360 DAY),
('KFGC-8888-9999-0004', 0, 'used', NOW() - INTERVAL 10 DAY),
('KFGC-8888-9999-0005', 500000, 'expired', NOW() - INTERVAL 5 DAY);
`;

  // ==========================================
  // 14. ARTICLES
  // ==========================================
  sql += `\n-- 14. ARTICLES (CẨM NANG & VIDEO HƯỚNG DẪN)
TRUNCATE TABLE \`articles\`;
INSERT INTO \`articles\` (\`id\`, \`type\`, \`title\`, \`slug\`, \`excerpt\`, \`content\`, \`cover\`, \`video_url\`, \`published_at\`) VALUES
(1, 'news', 'Cách Phân Biệt Nho Mẫu Đơn Chuẩn Nhật Bản Và Hàn Quốc', 'cach-phan-biet-nho-mau-don-chuan', 'Bí quyết nhận diện hương vị xạ hương đặc trưng, lớp phấn tự nhiên và tem truy xuất nguồn gốc.', 'Nho mẫu đơn Shine Muscat luôn là đỉnh cao quà tặng trái cây ngoại nhập...', 'https://images.unsplash.com/photo-1596363505729-4190a9506133?w=800', NULL, NOW() - INTERVAL 25 DAY),
(2, 'news', 'Bảo Quản Cherry Đúng Cách Để Giữ Trọn Độ Giòn Trong 7 Ngày', 'bao-quan-cherry-dung-cach', 'Nhiệt độ tủ mát 0 - 4 độ C và mẹo không rửa nước trước khi lưu trữ.', 'Cherry là loại trái cây nhạy cảm với nhiệt độ...', 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=800', NULL, NOW() - INTERVAL 20 DAY),
(3, 'news', 'Giá Trị Dinh Dưỡng Của Kiwi Vàng Zespri SunGold Đối Với Trẻ Nhỏ', 'dinh-duong-kiwi-vang-zespri-cho-tre', 'Gấp 3 lần vitamin C của cam, giàu chất xơ hòa tan giúp bé tăng đề kháng tự nhiên.', 'Mỗi quả kiwi vàng mang đến nguồn năng lượng tinh khiết...', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800', NULL, NOW() - INTERVAL 15 DAY),
(4, 'news', 'Ý Nghĩa Phong Thủy Của Giỏ Quà Trái Cây Trong Dịp Khánh Thành', 'y-nghia-phong-thuy-gio-qua-trai-cay', 'Sự hội tụ của ngũ hành mang lại vượng khí tài lộc cho gia chủ.', 'Tặng hoa quả là tặng sức khỏe và bình an...', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800', NULL, NOW() - INTERVAL 10 DAY),
(5, 'video', 'Video: Quy Trình Đóng Gói Giỏ Quà Cao Cấp Tại Klever Fruit', 'video-quy-trinh-dong-goi-gio-qua', 'Khám phá đôi bàn tay khéo léo của các nghệ nhân kết giỏ hoa quả Klever Fruit.', 'Quy trình chọn lọc từng quả đạt chuẩn 100%...', 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=800', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', NOW() - INTERVAL 5 DAY);
`;

  // ==========================================
  // 15. 10 DYNAMIC BANNERS ĐỦ TIÊU CHÍ (COUNTDOWN, HẾT HẠN, WEB, MOBILE, PLACEMENT)
  // ==========================================
  sql += `\n-- 15. BANNERS (10 BANNERS MẪU MỞ RỘNG ĐẠT CHUẨN)
TRUNCATE TABLE \`banners\`;
INSERT INTO \`banners\` (\`id\`, \`title\`, \`subtitle\`, \`image_url\`, \`image_web\`, \`image_mobile\`, \`placement\`, \`platform\`, \`link_url\`, \`link_type\`, \`link_value\`, \`cta_label\`, \`sort\`, \`start_at\`, \`end_at\`, \`countdown_at\`, \`is_active\`) VALUES
(1, 'MÙA VỤ CHERRY MỸ 2026', 'Tươi giòn cuống xanh, hạ cánh trực tiếp trong 24h từ thung lũng Yakima', '/uploads/banners/banner_1_web.svg', '/uploads/banners/banner_1_web.svg', '/uploads/banners/banner_1_mobile.svg', 'home_hero', 'all', '/category/cherry', 'collection', 'cherry', 'Khám Phá Ngay', 1, NOW() - INTERVAL 5 DAY, NOW() + INTERVAL 30 DAY, NOW() + INTERVAL 3 DAY, 1),

(2, 'BỘ SƯU TẬP QUÀ TẶNG 20/10', 'Thay ngàn lời chúc tri ân gửi đến người phụ nữ bạn yêu thương nhất', '/uploads/banners/banner_2_web.svg', '/uploads/banners/banner_2_web.svg', '/uploads/banners/banner_2_mobile.svg', 'home_hero', 'web', '/category/qua-tang-20-10', 'collection', 'bst-phon-hoa-20-10', 'Xem Bộ Sưu Tập', 2, NOW() - INTERVAL 10 DAY, NOW() + INTERVAL 25 DAY, NULL, 1),

(3, 'TRẢI NGHIỆM MUA SẮM APP DI ĐỘNG', 'Tích điểm 5% mọi đơn hàng và nhận thông báo nhắc quà tự động', '/uploads/banners/banner_3_mobile.svg', '/uploads/banners/banner_3_web.svg', '/uploads/banners/banner_3_mobile.svg', 'home_hero', 'mobile', '/account', 'url', '/account', 'Tải App Ngay', 3, NOW() - INTERVAL 15 DAY, NOW() + INTERVAL 60 DAY, NULL, 1),

(4, 'NHO MẪU ĐƠN SHINE MUSCAT ĐƯỜNG BAY VIP', 'Hương thơm xạ hương hoa nhài quý phái chuẩn chứng nhận Yamanashi', '/uploads/banners/banner_3_web.svg', '/uploads/banners/banner_3_web.svg', '/uploads/banners/banner_3_mobile.svg', 'home_hero', 'all', '/products/38', 'product', '38', 'Mua Ngay', 4, NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 45 DAY, NULL, 1),

(5, 'COMBO VITAMIN GIA ĐÌNH 7 NGÀY', 'Chăm sóc sức khỏe toàn diện mỗi sớm với 5 loại quả cao cấp', '/uploads/banners/banner_4_web.svg', '/uploads/banners/banner_4_web.svg', '/uploads/banners/banner_4_mobile.svg', 'home_mid', 'all', '/category/vitamin-gia-dinh', 'collection', 'vitamin-gia-dinh', 'Đặt Gói Tuần', 5, NOW() - INTERVAL 7 DAY, NOW() + INTERVAL 90 DAY, NULL, 1),

(6, 'QUÀ TẶNG DOANH NGHIỆP & CHIẾT KHẤU 20%', 'In logo doanh nghiệp miễn phí, xuất hóa đơn VAT điện tử nhanh chóng', '/uploads/banners/banner_1_web.svg', '/uploads/banners/banner_1_web.svg', '/uploads/banners/banner_1_mobile.svg', 'home_mid', 'web', '/category/qua-theo-nguoi-nhan', 'collection', 'qua-tang-doanh-nghiep', 'Tư Vấn Báo Giá', 6, NOW() - INTERVAL 12 DAY, NOW() + INTERVAL 90 DAY, NULL, 1),

(7, 'THẺ QUÀ TẶNG ĐIỆN TỬ KLEVER GIFT CARD', 'Tặng quà tinh tế không lo lệch sở thích, kích hoạt ngay trong 30 giây', '/uploads/banners/banner_4_mobile.svg', '/uploads/banners/banner_4_web.svg', '/uploads/banners/banner_4_mobile.svg', 'home_mid', 'mobile', '/category/gift-card', 'collection', 'gift-card', 'Mua Thẻ Quà', 7, NOW() - INTERVAL 20 DAY, NOW() + INTERVAL 90 DAY, NULL, 1),

(8, 'TUẦN LỄ NÔNG SẢN NEW ZEALAND', 'Táo Envy, Kiwi Zespri SunGold hạ giá tới 20% tại 22 cửa hàng', '/uploads/banners/banner_2_web.svg', '/uploads/banners/banner_2_web.svg', '/uploads/banners/banner_2_mobile.svg', 'category_top', 'all', '/category/tao', 'collection', 'new-zealand', 'Xem Ngay', 8, NOW() - INTERVAL 3 DAY, NOW() + INTERVAL 14 DAY, NULL, 1),

(9, 'CAM KẾT ĐỔI TRẢ KHÔNG CẦN LÝ DO TRONG 48H', 'Uy tín 15 năm chuỗi trái cây nhập khẩu thượng hạng số 1 Việt Nam', '/uploads/banners/banner_1_web.svg', '/uploads/banners/banner_1_web.svg', '/uploads/banners/banner_1_mobile.svg', 'category_top', 'all', '/articles/1', 'article', '1', 'Xem Chính Sách', 9, NOW() - INTERVAL 30 DAY, NOW() + INTERVAL 180 DAY, NULL, 1),

(10, 'FLASH SALE CUỐI TUẦN (BANNER ĐÃ HẾT HẠN - KIỂM TRA TỰ ẨN)', 'Chương trình ưu đãi chớp nhoáng đã khép lại theo kế hoạch', '/uploads/banners/banner_4_web.svg', '/uploads/banners/banner_4_web.svg', '/uploads/banners/banner_4_mobile.svg', 'home_hero', 'all', '/category/cherry', 'url', '/category/cherry', 'Đã Kết Thúc', 10, NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 2 DAY, NULL, 1);
`;

  // ==========================================
  // 16. JOB POSTS & APPLICATIONS
  // ==========================================
  sql += `\n-- 16. JOB POSTS & APPLICATIONS
TRUNCATE TABLE \`job_posts\`;
INSERT INTO \`job_posts\` (\`id\`, \`title\`, \`department\`, \`location\`, \`salary_range\`, \`description\`, \`requirements\`, \`status\`) VALUES
(1, 'Cửa Hàng Trưởng Chi Nhánh Hà Nội', 'Vận Hành Bán Lẻ', 'Đống Đa, Hà Nội', '15 - 20 triệu VNĐ', 'Quản lý doanh số, kho lạnh và đội ngũ nhân viên tư vấn khách hàng tại cửa hàng.', 'Tối thiểu 2 năm kinh nghiệm quản lý chuỗi F&B hoặc bán lẻ cao cấp.', 'open'),
(2, 'Nhân Viên Tư Vấn Bán Hàng & Kết Giỏ Quà', 'Cửa Hàng', 'Quận 1 / Quận 3, HCM', '8 - 12 triệu VNĐ', 'Tư vấn sản phẩm trái cây, kết giỏ hoa quả quà tặng theo yêu cầu khách hàng.', 'Nhanh nhẹn, cẩn thận, yêu thích công việc thẩm mỹ và hoa quả tươi.', 'open'),
(3, 'Chuyên Viên Marketing & Content Creator', 'Marketing', 'Hà Nội', '12 - 16 triệu VNĐ', 'Sáng tạo nội dung video ngắn, quản trị chiến dịch quà tặng doanh nghiệp.', 'Thành thạo CapCut, Photoshop, có tư duy thẩm mỹ thương hiệu cao cấp.', 'open');

TRUNCATE TABLE \`job_applications\`;
INSERT INTO \`job_applications\` (\`job_id\`, \`full_name\`, \`phone\`, \`email\`, \`note\`, \`status\`) VALUES
(1, 'Nguyễn Hoài Nam', '0912345678', 'nam.nguyen@gmail.com', 'Có 3 năm kinh nghiệm làm store manager tại Annam Gourmet.', 'reviewing'),
(2, 'Trần Bích Ngọc', '0987654321', 'bichngoc@gmail.com', 'Từng học khóa cắm hoa nghệ thuật và kết giỏ trái cây chuyên nghiệp.', 'accepted');
`;

  // ==========================================
  // 17. FEEDBACKS
  // ==========================================
  sql += `\n-- 17. FEEDBACKS
TRUNCATE TABLE \`feedbacks\`;
INSERT INTO \`feedbacks\` (\`name\`, \`phone\`, \`email\`, \`content\`, \`status\`, \`assigned_to\`) VALUES
('Chị Hà Phương', '0911223344', 'haphuong@gmail.com', 'Giỏ quà 20/10 công ty mình nhận sáng nay rất tươi đẹp, sếp mình khen nức nở.', 'resolved', 2),
('Anh Minh Trí', '0922334455', 'minhtri@gmail.com', 'Cần tư vấn đặt 50 hộp quà trái cây cho đối tác Nhật Bản vào tuần tới.', 'in_progress', 3);
`;

  // ==========================================
  // 18. SPECIAL DATES & WISHLISTS & REVIEWS
  // ==========================================
  sql += `\n-- 18. SPECIAL DATES & WISHLISTS & REVIEWS
TRUNCATE TABLE \`special_dates\`;
INSERT INTO \`special_dates\` (\`user_id\`, \`title\`, \`date\`, \`reminder_days\`, \`note\`) VALUES
(4, 'Sinh nhật Vợ yêu', '2026-10-28', 3, 'Đặt giỏ quà Lục Bảo và hoa tươi kèm thiệp chúc'),
(4, 'Kỷ niệm Ngày Cưới', '2026-11-15', 5, 'Đặt Set Vitamin gia đình');

TRUNCATE TABLE \`wishlists\`;
INSERT INTO \`wishlists\` (\`user_id\`, \`product_id\`) VALUES
(4, 1), (4, 12), (4, 29),
(5, 2), (5, 38), (5, 48);

TRUNCATE TABLE \`reviews\`;
INSERT INTO \`reviews\` (\`product_id\`, \`user_id\`, \`rating\`, \`comment\`, \`status\`) VALUES
(1, 4, 5, 'Giỏ quà Lục Bảo xuất sắc! Nho mẫu đơn giòn ngọt thơm lừng, táo Envy đỏ đẹp không tì vết.', 'approved'),
(38, 5, 5, 'Nho Mẫu Đơn chuẩn đường bay, phấn trắng đều quả to bự, ăn đáng đồng tiền bát gạo.', 'approved'),
(29, 6, 5, 'Cherry đỏ Mỹ cuống xanh ngắt, cắn giòn giòn mọng nước, gia đình ai cũng thích.', 'approved'),
(48, 7, 5, 'Táo Envy Size 24 giòn ngọt thơm mát, giao hàng đóng gói cẩn thận 5 sao!', 'approved');
`;

  // ==========================================
  // 19. SHIFTS & ATTENDANCE
  // ==========================================
  sql += `\n-- 19. SHIFTS & ATTENDANCE
TRUNCATE TABLE \`shifts\`;
INSERT INTO \`shifts\` (\`store_id\`, \`staff_id\`, \`date\`, \`shift_type\`, \`start_time\`, \`end_time\`) VALUES
(1, 2, CURDATE(), 'morning', '07:00:00', '15:00:00'),
(2, 3, CURDATE(), 'morning', '07:00:00', '15:00:00'),
(1, 2, CURDATE() + INTERVAL 1 DAY, 'morning', '07:00:00', '15:00:00'),
(2, 3, CURDATE() + INTERVAL 1 DAY, 'afternoon', '14:30:00', '22:00:00');

TRUNCATE TABLE \`attendance\`;
INSERT INTO \`attendance\` (\`staff_id\`, \`store_id\`, \`check_in\`, \`check_out\`, \`status\`, \`note\`) VALUES
(2, 1, NOW() - INTERVAL 4 HOUR, NULL, 'on_time', 'Ca sáng cửa hàng 63 Yên Lãng'),
(3, 2, NOW() - INTERVAL 4 HOUR, NULL, 'on_time', 'Ca sáng cửa hàng 31B Phan Đình Phùng');
`;

  // ==========================================
  // 20. SETTINGS
  // ==========================================
  sql += `\n-- 20. SETTINGS
TRUNCATE TABLE \`settings\`;
INSERT INTO \`settings\` (\`key\`, \`value\`, \`description\`) VALUES
('company_info', '{"name": "CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ ĐẦU TƯ K.L.E.V.E", "brand": "Klever Fruit", "hotline": "1900 63 38 83", "email": "cskh@kleverjuice.com.vn", "address": "Số 63 Yên Lãng, Đống Đa, Hà Nội", "established": 2009}', 'Thông tin pháp nhân công ty'),
('return_policy', '{"hoursLimit": 48, "condition": "Hoàn tiền hoặc đổi trả không cần lý do trong vòng 48h kể từ khi giao hàng thành công."}', 'Chính sách hoàn tiền đổi trả'),
('loyalty_rules', '{"earnRatePercent": 5, "pointToVnd": 1000}', 'Quy định tích điểm thành viên (5% giá trị đơn hàng)');
`;

  // ==========================================
  // 21. 40 SAMPLE ORDERS SPREAD OVER LAST 60 DAYS
  // ==========================================
  sql += `\n-- 21. 40 SAMPLE ORDERS VỚI ĐỦ CÁC TRẠNG THÁI TRONG 60 NGÀY QUA
TRUNCATE TABLE \`orders\`;
TRUNCATE TABLE \`order_items\`;
TRUNCATE TABLE \`order_status_history\`;
TRUNCATE TABLE \`return_requests\`;
`;

  const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPING', 'COMPLETED', 'CANCELLED', 'RETURNED'] as const;
  const payMethods = ['cod', 'vietqr', 'vnpay'] as const;
  const customers = [
    { id: 4, name: 'Hoàng Tuấn Anh', phone: '0900000011', addr: 'Số 15, Ngõ 102 Hoàng Cầu', dist: 'Đống Đa', city: 'Hà Nội' },
    { id: 5, name: 'Vũ Phương Linh', phone: '0900000012', addr: 'P1204 Discovery Complex, 302 Cầu Giấy', dist: 'Cầu Giấy', city: 'Hà Nội' },
    { id: 6, name: 'Lê Đăng Quang', phone: '0900000013', addr: 'Park 8 Tầng 22, Vinhomes Times City', dist: 'Hai Bà Trưng', city: 'Hà Nội' },
    { id: 7, name: 'Phạm Mai Thảo', phone: '0900000014', addr: '45 Tú Xương', dist: 'Quận 3', city: 'Hồ Chí Minh' },
    { id: 8, name: 'Đỗ Trung Hiếu', phone: '0900000015', addr: '88 Tràng Tiền Plaza', dist: 'Hoàn Kiếm', city: 'Hà Nội' },
  ];

  const orderInserts: string[] = [];
  const itemInserts: string[] = [];
  const historyInserts: string[] = [];
  const returnInserts: string[] = [];

  let itemIdCounter = 1;

  for (let i = 1; i <= 40; i++) {
    const cust = customers[(i - 1) % customers.length];
    const storeId = ((i - 1) % 22) + 1;
    const daysAgo = Math.floor(58 * (40 - i) / 40);
    const code = `KF26${String(1000 + i)}`;

    let status: typeof statuses[number];
    if (i <= 5) status = 'PENDING';
    else if (i <= 10) status = 'CONFIRMED';
    else if (i <= 14) status = 'PREPARING';
    else if (i <= 18) status = 'READY';
    else if (i <= 22) status = 'SHIPPING';
    else if (i <= 34) status = 'COMPLETED';
    else if (i <= 37) status = 'CANCELLED';
    else status = 'RETURNED';

    const payMethod = payMethods[i % payMethods.length];
    const payStatus = status === 'COMPLETED' ? 'paid' : (status === 'RETURNED' ? 'refunded' : (payMethod === 'cod' ? 'unpaid' : 'paid'));
    const deliveryType = i % 4 === 0 ? 'pickup' : 'ship';
    const shipFee = deliveryType === 'pickup' ? 0 : 25000;
    const greetingMsg = (i % 2 === 0) ? 'Kính chúc người nhận luôn dồi dào sức khỏe, may mắn và hạnh phúc ngập tràn!' : '';

    const variantId1 = ((i * 3) % totalVariants) + 1;
    const variantId2 = ((i * 3 + 7) % totalVariants) + 1;
    const item1Price = 249000 + (variantId1 * 15000);
    const item2Price = 199000 + (variantId2 * 10000);
    const qty1 = (i % 2) + 1;
    const qty2 = (i % 3 === 0) ? 1 : 0;

    let subtotal = (item1Price * qty1);
    if (qty2 > 0) subtotal += (item2Price * qty2);
    const discount = (i % 5 === 0) ? 50000 : 0;
    const total = subtotal + shipFee - discount;

    orderInserts.push(`(${i}, '${code}', ${cust.id}, ${storeId}, '${cust.name}', '${cust.phone}', '${cust.addr}', '${cust.dist}', '${cust.city}', '${deliveryType}', DATE(NOW() - INTERVAL ${daysAgo} DAY), '09:00 - 11:30', '${greetingMsg}', 'Ruy-băng Tím Klever', ${subtotal}, ${shipFee}, ${discount}, ${total}, '${payMethod}', '${payStatus}', '${status}', NULL, NOW() - INTERVAL ${daysAgo} DAY)`);

    itemInserts.push(`(${itemIdCounter++}, ${i}, ${variantId1}, 'Trái Cây Thượng Hạng #${variantId1}', 'Tiêu chuẩn', ${item1Price}, ${qty1}, ${item1Price * qty1})`);
    if (qty2 > 0) {
      itemInserts.push(`(${itemIdCounter++}, ${i}, ${variantId2}, 'Trái Cây Thượng Hạng #${variantId2}', 'Tiêu chuẩn', ${item2Price}, ${qty2}, ${item2Price * qty2})`);
    }

    historyInserts.push(`(${i}, 'PENDING', 'Khách hàng đặt đơn thành công', ${cust.id}, NOW() - INTERVAL ${daysAgo} DAY)`);
    if (['CONFIRMED', 'PREPARING', 'READY', 'SHIPPING', 'COMPLETED', 'RETURNED'].includes(status)) {
      historyInserts.push(`(${i}, 'CONFIRMED', 'Cửa hàng đã xác nhận đơn', 2, NOW() - INTERVAL ${daysAgo} DAY + INTERVAL 15 MINUTE)`);
    }
    if (['PREPARING', 'READY', 'SHIPPING', 'COMPLETED', 'RETURNED'].includes(status)) {
      historyInserts.push(`(${i}, 'PREPARING', 'Đang tuyển chọn quả và thắt nơ giỏ quà', 2, NOW() - INTERVAL ${daysAgo} DAY + INTERVAL 30 MINUTE)`);
    }
    if (['READY', 'SHIPPING', 'COMPLETED', 'RETURNED'].includes(status)) {
      historyInserts.push(`(${i}, 'READY', 'Đơn hàng đã sẵn sàng giao', 2, NOW() - INTERVAL ${daysAgo} DAY + INTERVAL 60 MINUTE)`);
    }
    if (['SHIPPING', 'COMPLETED', 'RETURNED'].includes(status)) {
      historyInserts.push(`(${i}, 'SHIPPING', 'Shipper đang trên đường vận chuyển trong thùng lạnh', 2, NOW() - INTERVAL ${daysAgo} DAY + INTERVAL 90 MINUTE)`);
    }
    if (status === 'COMPLETED') {
      historyInserts.push(`(${i}, 'COMPLETED', 'Giao hàng thành công. Khách hàng đã nhận hoa quả tươi ngon.', 2, NOW() - INTERVAL ${daysAgo} DAY + INTERVAL 120 MINUTE)`);
    } else if (status === 'CANCELLED') {
      historyInserts.push(`(${i}, 'CANCELLED', 'Khách hàng đổi ý muốn chuyển sang mẫu giỏ quà khác.', ${cust.id}, NOW() - INTERVAL ${daysAgo} DAY + INTERVAL 20 MINUTE)`);
    } else if (status === 'RETURNED') {
      historyInserts.push(`(${i}, 'COMPLETED', 'Giao thành công', 2, NOW() - INTERVAL ${daysAgo} DAY + INTERVAL 100 MINUTE)`);
      historyInserts.push(`(${i}, 'RETURNED', 'Đã đổi trả và hoàn tiền 100% theo chính sách 48h của Klever Fruit', 2, NOW() - INTERVAL ${daysAgo} DAY + INTERVAL 5 HOUR)`);
      returnInserts.push(`(${i}, 'Khách phản hồi 2 quả táo bị cấn nhẹ trong lúc vận chuyển đường bộ, đề xuất đổi mới.', '["https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400"]', 'approved', NOW() - INTERVAL ${daysAgo} DAY + INTERVAL 4 HOUR, 1, 'Đồng ý đổi trả theo cam kết 48h')`);
    }
  }

  returnInserts.push(`(33, 'Muốn đổi sang loại nho khác do người nhận thích nho đen.', '["https://images.unsplash.com/photo-1596363505729-4190a9506133?w=400"]', 'pending', NOW() - INTERVAL 12 HOUR, NULL, NULL)`);

  sql += `INSERT INTO \`orders\` (\`id\`, \`code\`, \`user_id\`, \`store_id\`, \`receiver_name\`, \`receiver_phone\`, \`receiver_address\`, \`receiver_district\`, \`receiver_city\`, \`delivery_type\`, \`delivery_date\`, \`delivery_slot\`, \`greeting_message\`, \`ribbon_color\`, \`subtotal\`, \`ship_fee\`, \`discount\`, \`total\`, \`payment_method\`, \`payment_status\`, \`status\`, \`vat_request\`, \`created_at\`) VALUES\n` + orderInserts.join(',\n') + ';\n\n';

  sql += `INSERT INTO \`order_items\` (\`id\`, \`order_id\`, \`variant_id\`, \`product_name\`, \`variant_label\`, \`unit_price\`, \`qty\`, \`total_price\`) VALUES\n` + itemInserts.join(',\n') + ';\n\n';

  sql += `INSERT INTO \`order_status_history\` (\`order_id\`, \`status\`, \`note\`, \`by_user_id\`, \`created_at\`) VALUES\n` + historyInserts.join(',\n') + ';\n\n';

  sql += `INSERT INTO \`return_requests\` (\`order_id\`, \`reason\`, \`images\`, \`status\`, \`created_at\`, \`decided_by\`, \`decision_note\`) VALUES\n` + returnInserts.join(',\n') + ';\n\n';

  sql += `INSERT IGNORE INTO inventory_batches (store_id,variant_id,batch_no,qty,legacy)
SELECT store_id,variant_id,'LEGACY',qty,1 FROM inventory;
SET FOREIGN_KEY_CHECKS = 1;\n`;
  return sql;
}

export function getSeedProducts() {
  const originalProducts = [
    // Category 1: Quà Tặng 20/10 (10 món)
    { id: 1, name: 'Giỏ Quà 20/10 - Lục Bảo Luxury', slug: 'gio-qua-20-10-luc-bao', cat: 1, origin: 'Nhập Khẩu VIP', price: 1499000, cmp: 1750000, disc: 14, isGift: 1, emoji: '🎁', desc: 'Giỏ quà thượng hạng kết hợp Nho Mẫu Đơn Hàn Quốc, Táo Envy New Zealand và Lê Singo Hàn Quốc, đóng gói nơ ruy-băng tím Klever Fruit và thiệp mạ vàng.' },
    { id: 2, name: 'Hộp Quà 20/10 - Kim Hoa Thượng Phẩm', slug: 'hop-qua-20-10-kim-hoa', cat: 1, origin: 'Nhập Khẩu VIP', price: 1999000, cmp: 2200000, disc: 9, isGift: 1, emoji: '🎁', desc: 'Hộp da cao cấp lót lụa chứa Cherry Đỏ Mỹ Size 8.5, Nho Shine Muscat và Kiwi vàng New Zealand sang trọng.' },
    { id: 3, name: 'Hộp Quà 20/10 - Kim Ngọc Phú Quý', slug: 'hop-qua-20-10-kim-ngoc', cat: 1, origin: 'Nhập Khẩu VIP', price: 1799000, cmp: 1999000, disc: 10, isGift: 1, emoji: '🎁', desc: 'Sự hòa quyện tuyệt vời của Nho Royal Vine Hàn Quốc, Dâu tây Seolhyang và Cam Cara ruột đỏ Úc.' },
    { id: 4, name: 'Giỏ Quà 20/10 - Mộc Niên Tri Ân', slug: 'gio-qua-20-10-moc-nien', cat: 1, origin: 'Nhập Khẩu', price: 1199000, cmp: 1350000, disc: 11, isGift: 1, emoji: '🧺', desc: 'Giỏ mây mộc đan tay tự nhiên chứa các loại trái cây bồi bổ sức khỏe người phụ nữ yêu thương.' },
    { id: 5, name: 'Hộp Quà 20/10 - Thanh Hoa Nhã Nhặn', slug: 'hop-qua-20-10-thanh-hoa', cat: 1, origin: 'Nhập Khẩu', price: 999000, cmp: 1150000, disc: 13, isGift: 1, emoji: '🎁', desc: 'Thiết kế tinh giản, thanh khiết với Dưa Musk Melon Nhật Bản và Lê Hosui giòn ngọt.' },
    { id: 6, name: 'Giỏ Quà 20/10 - Dáng Hoa Tuyệt Sắc VIP', slug: 'gio-qua-20-10-dang-hoa-vip', cat: 1, origin: 'Nhập Khẩu VIP', price: 2999000, cmp: 3400000, disc: 12, isGift: 1, emoji: '🧺', desc: 'Giỏ quà đại thụ cao cấp nhất mùa lễ hội, đầy đủ cherry, việt quất, nho mẫu đơn và hồng giòn.' },
    { id: 7, name: 'Hộp Quà 20/10 - Phúc Hoa May Mắn', slug: 'hop-qua-20-10-phuc-hoa', cat: 1, origin: 'Nhập Khẩu', price: 799000, cmp: 899000, disc: 11, isGift: 1, emoji: '🎁', desc: 'Món quà ý nghĩa tặng mẹ, cô giáo và đồng nghiệp nữ dịp 20/10.' },
    { id: 8, name: 'Hộp Quà 20/10 - Thịnh Hoa Phát Tài', slug: 'hop-qua-20-10-thinh-hoa', cat: 1, origin: 'Nhập Khẩu', price: 649000, cmp: 720000, disc: 10, isGift: 1, emoji: '🎁', desc: 'Hộp quà nhỏ gọn tinh tế phối hoa lụa và trái cây nhập khẩu tuyển chọn.' },
    { id: 9, name: 'Hộp Quà 20/10 - Quý Phái Hoàng Triều', slug: 'hop-qua-20-10-quy-phai', cat: 1, origin: 'Nhập Khẩu VIP', price: 2499000, cmp: 2800000, disc: 11, isGift: 1, emoji: '🎁', desc: 'Tuyệt phẩm hoa quả đường bay VIP chỉ dành cho các đối tác nữ và quý cô trang trọng.' },
    { id: 10, name: 'Hộp Trái Cây 20/10 - Trái Tim Yêu Thương', slug: 'hop-trai-cay-20-10-trai-tim', cat: 1, origin: 'Nhập Khẩu', price: 850000, cmp: 950000, disc: 11, isGift: 1, emoji: '❤️', desc: 'Hộp mica trái tim xếp đầy dâu tây Seolhyang đỏ thắm xen kẽ việt quất tươi mọng nước.' },

    // Category 2: Giỏ & Hộp Quà Lễ Tết (10 món)
    { id: 11, name: 'Giỏ Quà Tết - Vạn Sự Như Ý', slug: 'gio-qua-tet-van-su-nhu-y', cat: 2, origin: 'Nhập Khẩu VIP', price: 2190000, cmp: 2500000, disc: 12, isGift: 1, emoji: '🧺', desc: 'Giỏ quà Tết sum vầy với dưa lưới Nhật, nho đỏ Mỹ, táo Envy và cam vàng mọng nước mang tài lộc năm mới.' },
    { id: 12, name: 'Hộp Quà Tết - Phú Quý An Khang', slug: 'hop-qua-tet-phu-quy-an-khang', cat: 2, origin: 'Nhập Khẩu VIP', price: 1850000, cmp: 2100000, disc: 12, isGift: 1, emoji: '🎁', desc: 'Hộp quà truyền thống tông đỏ vàng sang trọng biếu gia đình bề trên ngày Tết.' },
    { id: 13, name: 'Giỏ Quà 14/2 - Sweet Valentine Love Box', slug: 'gio-qua-14-2-valentine-love', cat: 2, origin: 'Nhập Khẩu', price: 1290000, cmp: 1450000, disc: 11, isGift: 1, emoji: '💖', desc: 'Set quà dâu tây bạch tuyết Nhật và cherry đỏ ngọt ngào đắm say tặng người yêu dịp 14/2.' },
    { id: 14, name: 'Giỏ Quà 8/3 - Nàng Thơ Rực Rỡ', slug: 'gio-qua-8-3-nang-tho-ruc-ro', cat: 2, origin: 'Nhập Khẩu VIP', price: 1590000, cmp: 1800000, disc: 12, isGift: 1, emoji: '🌸', desc: 'Bản hòa ca của sắc đẹp và dinh dưỡng thanh xuân dành tặng phụ nữ ngày Quốc tế Phụ nữ.' },
    { id: 15, name: 'Giỏ Quà Trung Thu - Trăng Rằm Đoàn Viên', slug: 'gio-qua-trung-thu-doan-vien', cat: 2, origin: 'Nhập Khẩu', price: 1390000, cmp: 1550000, disc: 10, isGift: 1, emoji: '🌕', desc: 'Bưởi da xanh Bến Tre kết hợp hồng giòn Hàn Quốc và dưa lưới trăng tròn trọn vị đoàn viên.' },
    { id: 16, name: 'Giỏ Quà 20/11 - Nét Bút Tri Ân Thầy Cô', slug: 'gio-qua-20-11-tri-an-thay-co', cat: 2, origin: 'Nhập Khẩu', price: 950000, cmp: 1100000, disc: 14, isGift: 1, emoji: '📚', desc: 'Món quà trang trọng bày tỏ lòng biết ơn sâu sắc đến quý thầy cô giáo.' },
    { id: 17, name: 'Hộp Quà Giáng Sinh - Merry Berry Magic', slug: 'hop-qua-giang-sinh-merry-berry', cat: 2, origin: 'Nhập Khẩu VIP', price: 1750000, cmp: 1950000, disc: 10, isGift: 1, emoji: '🎄', desc: 'Phối màu Noel đỏ xanh ấn tượng từ cherry Úc, kiwi vàng và dâu tây Hàn thơm nức.' },
    { id: 18, name: 'Giỏ Quà Cầu Tài - Lễ Chùa Đầu Năm', slug: 'gio-qua-cau-tai-le-chua', cat: 2, origin: 'Nhập Khẩu', price: 1150000, cmp: 1300000, disc: 12, isGift: 1, emoji: '🪷', desc: 'Giỏ trái cây tươi tắn trang nghiêm phục vụ dâng hương tạ lễ đền chùa.' },
    { id: 19, name: 'Hộp Quà Tân Niên - Khởi Đầu Thịnh Vượng', slug: 'hop-qua-tan-nien-thinh-vuong', cat: 2, origin: 'Nhập Khẩu VIP', price: 2600000, cmp: 2950000, disc: 12, isGift: 1, emoji: '🧧', desc: 'Hộp quà khai xuân doanh nghiệp mở bát may mắn, hồng phát tài lộc.' },
    { id: 20, name: 'Giỏ Quà Mừng Thọ - Bách Niên Giai Lão', slug: 'gio-qua-mung-tho-bach-nien', cat: 2, origin: 'Nhập Khẩu VIP', price: 1980000, cmp: 2250000, disc: 12, isGift: 1, emoji: '🎋', desc: 'Trái cây giàu dưỡng chất bồi dưỡng thể lực, chúc ông bà sống lâu trăm tuổi.' },

    // Category 3: Quà Theo Người Nhận & Đối Tác (8 món)
    { id: 21, name: 'Giỏ Quà Đối Tác - Hợp Tác Thành Công', slug: 'gio-qua-doi-tac-hop-tac', cat: 3, origin: 'Nhập Khẩu VIP', price: 3200000, cmp: 3600000, disc: 11, isGift: 1, emoji: '🤝', desc: 'Set quà đẳng cấp danh giá thiết kế riêng cho quan hệ đối tác kinh doanh chiến lược.' },
    { id: 22, name: 'Hộp Quà Cha Mẹ - Hiếu Nghĩa Sinh Thành', slug: 'hop-qua-cha-me-hieu-nghia', cat: 3, origin: 'Nhập Khẩu', price: 1450000, cmp: 1650000, disc: 12, isGift: 1, emoji: '🏡', desc: 'Món quà trọn vẹn yêu thương gửi về đấng sinh thành, thanh mát dễ tiêu hóa.' },
    { id: 23, name: 'Giỏ Quà Thăm Bệnh - Phục Hồi Thần Tốc', slug: 'gio-qua-tham-benh-phuc-hoi', cat: 3, origin: 'Nhập Khẩu', price: 1050000, cmp: 1200000, disc: 13, isGift: 1, emoji: '🌿', desc: 'Các loại trái cây giàu vitamin C và chất chống oxy hóa giúp người bệnh mau lại sức.' },
    { id: 24, name: 'Hộp Quà Chúc Mừng Tân Gia - Phát Tài', slug: 'hop-qua-mung-tan-gia-phat-tai', cat: 3, origin: 'Nhập Khẩu VIP', price: 1890000, cmp: 2100000, disc: 10, isGift: 1, emoji: '🔑', desc: 'Món quà tân gia nhà mới mang lại vượng khí, tài lộc và hạnh phúc gia đạo.' },
    { id: 25, name: 'Hộp Quà Thăm Đầy Tháng - Bé Khỏe Mẹ Vui', slug: 'hop-qua-tham-day-thang', cat: 3, origin: 'Nhập Khẩu', price: 890000, cmp: 1000000, disc: 11, isGift: 1, emoji: '🍼', desc: 'Trái cây lành tính mát sữa cho mẹ sau sinh và bổ sung khoáng chất tự nhiên.' },
    { id: 26, name: 'Giỏ Quà Tri Ân Khách Hàng Thân Thiết', slug: 'gio-qua-tri-an-khach-hang', cat: 3, origin: 'Nhập Khẩu VIP', price: 1650000, cmp: 1850000, disc: 11, isGift: 1, emoji: '💎', desc: 'Lời cảm ơn chân thành từ Klever Fruit gửi đến những người bạn đồng hành thủy chung.' },
    { id: 27, name: 'Hộp Quà Chúc Sếp - Thăng Quan Tiến Chức', slug: 'hop-qua-chuc-sep-thang-tien', cat: 3, origin: 'Nhập Khẩu VIP', price: 2800000, cmp: 3200000, disc: 13, isGift: 1, emoji: '⭐', desc: 'Đẳng cấp xứng tầm lãnh đạo với nho mẫu đơn thượng hạng và táo Sekai-Ichi Nhật Bản.' },
    { id: 28, name: 'Giỏ Quà Sinh Nhật Bạn Bè - Tươi Vui', slug: 'gio-qua-sinh-nhat-ban-be', cat: 3, origin: 'Nhập Khẩu', price: 780000, cmp: 890000, disc: 12, isGift: 1, emoji: '🎂', desc: 'Trẻ trung, ngọt lành, mang lại nụ cười rạng rỡ cho bữa tiệc sinh nhật bè bạn.' },

    // Category 4: Cherry Nhập Khẩu (9 món)
    { id: 29, name: 'Cherry Đỏ Mỹ Size 8.5 Thượng Hạng', slug: 'cherry-do-my-size-8-5', cat: 4, origin: 'Mỹ', price: 650000, cmp: 750000, disc: 13, isGift: 0, emoji: '🍒', desc: 'Cherry quả to tròn đanh chắc, vỏ đỏ thẫm bóng bẩy, cuống xanh tươi rói đường bay 24h.' },
    { id: 30, name: 'Cherry Vàng Rainier Mỹ Siêu Ngọt', slug: 'cherry-vang-rainier-my', cat: 4, origin: 'Mỹ', price: 899000, cmp: 990000, disc: 9, isGift: 0, emoji: '🍒', desc: 'Nữ hoàng cherry màu vàng ửng hồng, độ ngọt brix trên 20, sản lượng cực kỳ khan hiếm.' },
    { id: 31, name: 'Cherry Đỏ Tasmania Úc Size 30-32', slug: 'cherry-do-tasmania-uc', cat: 4, origin: 'Úc', price: 920000, cmp: 1050000, disc: 12, isGift: 0, emoji: '🍒', desc: 'Vùng đảo Tasmania nguyên sơ mang lại chất lượng cherry giòn ngọt đỉnh cao thế giới.' },
    { id: 32, name: 'Cherry Đỏ New Zealand Size 30+', slug: 'cherry-do-new-zealand-30', cat: 4, origin: 'New Zealand', price: 880000, cmp: 990000, disc: 11, isGift: 0, emoji: '🍒', desc: 'Mùa vụ đón tết dương lịch, quả căng mọng, vị ngọt đậm thơm nồng say đắm.' },
    { id: 33, name: 'Cherry Đỏ Chile Size Jumbo', slug: 'cherry-do-chile-jumbo', cat: 4, origin: 'Chile', price: 420000, cmp: 480000, disc: 13, isGift: 0, emoji: '🍒', desc: 'Lựa chọn kinh tế tuyệt vời cho gia đình thưởng thức cherry giòn ngọt mỗi ngày.' },
    { id: 34, name: 'Cherry Đỏ Mỹ Size 9.0 Tiêu Chuẩn', slug: 'cherry-do-my-size-9-0', cat: 4, origin: 'Mỹ', price: 599000, cmp: 680000, disc: 12, isGift: 0, emoji: '🍒', desc: 'Size 9.0 giòn chắc, vị chua nhẹ thanh tao hòa cùng vị ngọt đậm đà.' },
    { id: 35, name: 'Cherry Đỏ Canada Mùa Hè', slug: 'cherry-do-canada-mua-he', cat: 4, origin: 'Canada', price: 680000, cmp: 780000, disc: 13, isGift: 0, emoji: '🍒', desc: 'Thu hoạch từ thung lũng Okanagan màu mỡ, bảo quản lạnh tối ưu giữ trọn độ giòn.' },
    { id: 36, name: 'Cherry Vàng Úc Rainier Hộp Quà', slug: 'cherry-vang-uc-rainier-hop-qua', cat: 4, origin: 'Úc', price: 1100000, cmp: 1250000, disc: 12, isGift: 0, emoji: '🍒', desc: 'Đóng hộp sang trọng 1kg lót nhung, món quà quý phái biếu tặng thượng cấp.' },
    { id: 37, name: 'Cherry Đỏ Mỹ Hộp Quà 2kg Thượng Phẩm', slug: 'cherry-do-my-hop-2kg', cat: 4, origin: 'Mỹ', price: 1350000, cmp: 1550000, disc: 13, isGift: 0, emoji: '🍒', desc: 'Hộp quà 2kg xách tay sang trọng, thích hợp đi chúc mừng và tiếp khách quý.' },

    // Category 5: Nho Nhập Khẩu & Nho Mẫu Đơn (10 món)
    { id: 38, name: 'Nho Mẫu Đơn Shine Muscat Nhật Bản', slug: 'nho-mau-don-shine-muscat-nhat', cat: 5, origin: 'Nhật Bản', price: 1890000, cmp: 2200000, disc: 14, isGift: 0, emoji: '🍇', desc: 'Chuẩn chứng nhận tỉnh Yamanashi, quả xanh như ngọc bích, thơm ngát mùi xạ hương hoa nhài.' },
    { id: 39, name: 'Nho Shine Muscat Hàn Quốc VIP', slug: 'nho-shine-muscat-han-quoc-vip', cat: 5, origin: 'Hàn Quốc', price: 999000, cmp: 1299000, disc: 23, isGift: 0, emoji: '🍇', desc: 'Chùm nho mẫu đơn đều quả không tì vết, độ ngọt cao, tan chảy ngọt ngào đầu lưỡi.' },
    { id: 40, name: 'Nho Ngón Tay Úc (Witch Finger / Midnight Beauty)', slug: 'nho-ngon-tay-uc', cat: 5, origin: 'Úc', price: 349000, cmp: 399000, disc: 13, isGift: 0, emoji: '🍇', desc: 'Hình dáng thon dài độc đáo, không hạt, vỏ mỏng giòn rụm vị ngọt đậm đà.' },
    { id: 41, name: 'Nho Xanh Autumn Crisp Mỹ Không Hạt', slug: 'nho-xanh-autumn-crisp-my', cat: 5, origin: 'Mỹ', price: 249000, cmp: 299000, disc: 17, isGift: 0, emoji: '🍇', desc: 'Giống nho xanh nổi tiếng giòn tan như cắn táo, không hạt, mọng nước mát lạnh.' },
    { id: 42, name: 'Nho Đen Không Hạt Midnight Mỹ', slug: 'nho-den-midnight-my', cat: 5, origin: 'Mỹ', price: 239000, cmp: 280000, disc: 15, isGift: 0, emoji: '🍇', desc: 'Màu đen tuyền óng ả phủ lớp phấn tự nhiên, giàu resveratrol bảo vệ tim mạch.' },
    { id: 43, name: 'Nho Đỏ Kẹo Candy Snaps Mỹ', slug: 'nho-do-candy-snaps-my', cat: 5, origin: 'Mỹ', price: 289000, cmp: 330000, disc: 12, isGift: 0, emoji: '🍇', desc: 'Vị ngọt kẹo dâu tây tự nhiên thơm lừng mê hoặc cả người lớn lẫn trẻ em.' },
    { id: 44, name: 'Nho Đỏ Crimson Úc Không Hạt', slug: 'nho-do-crimson-uc', cat: 5, origin: 'Úc', price: 219000, cmp: 260000, disc: 16, isGift: 0, emoji: '🍇', desc: 'Quả chắc cuống, vị ngọt dịu thanh mát, dồi dào chất xơ và vitamin khoáng chất.' },
    { id: 45, name: 'Nho Xanh Sweet Globe Peru', slug: 'nho-xanh-sweet-globe-peru', cat: 5, origin: 'Peru', price: 229000, cmp: 270000, disc: 15, isGift: 0, emoji: '🍇', desc: 'Quả to tròn xoe, giòn rôm rốp, thanh lọc nhiệt cơ thể tuyệt vời.' },
    { id: 46, name: 'Nho Hồng Kyoho Hàn Quốc', slug: 'nho-hong-kyoho-han-quoc', cat: 5, origin: 'Hàn Quốc', price: 450000, cmp: 520000, disc: 13, isGift: 0, emoji: '🍇', desc: 'Vua nho tráng miệng xứ kim chi, ruột thạch mọng nước thơm mùi rượu vang nhẹ.' },
    { id: 47, name: 'Nho Đen Ngón Tay Mỹ Hộp 1kg', slug: 'nho-den-ngon-tay-my-1kg', cat: 5, origin: 'Mỹ', price: 360000, cmp: 420000, disc: 14, isGift: 0, emoji: '🍇', desc: 'Nho ngón tay Mỹ vị thơm đậm, thịt chắc dày cắn sướng miệng.' },

    // Category 6: Táo Thượng Hạng (10 món)
    { id: 48, name: 'Táo Envy New Zealand Size 24 Lớn', slug: 'tao-envy-new-zealand-size-24', cat: 6, origin: 'New Zealand', price: 289000, cmp: 320000, disc: 10, isGift: 0, emoji: '🍎', desc: 'Táo Envy nức tiếng thế giới với ruột trắng ngần, giòn đanh và ngọt thơm mê hoặc.' },
    { id: 49, name: 'Táo Dazzle New Zealand Giòn Tan', slug: 'tao-dazzle-new-zealand', cat: 6, origin: 'New Zealand', price: 199000, cmp: 230000, disc: 13, isGift: 0, emoji: '🍎', desc: 'Giống táo mới màu đỏ rực rỡ, thịt giòn tan, vị ngọt đậm tự nhiên.' },
    { id: 50, name: 'Táo Sekai Ichi Nhật Bản Quả VIP 800g', slug: 'tao-sekai-ichi-nhat-ban', cat: 6, origin: 'Nhật Bản', price: 550000, cmp: 600000, disc: 8, isGift: 0, emoji: '🍎', desc: 'Táo số một thế giới, chăm sóc thụ phấn bằng tay, trọng lượng khủng biếu quà đẳng cấp.' },
    { id: 51, name: 'Táo Rockit New Zealand Ống 4 Quả', slug: 'tao-rockit-new-zealand-ong-4', cat: 6, origin: 'New Zealand', price: 129000, cmp: 145000, disc: 11, isGift: 0, emoji: '🍎', desc: 'Thiết kế dạng ống độc quyền, táo mini lõi nhỏ xíu, vị ngọt giòn ngậy tiện lợi.' },
    { id: 52, name: 'Táo Fuji Nhật Bản Tuyển Chọn', slug: 'tao-fuji-nhat-ban-tuyen-chon', cat: 6, origin: 'Nhật Bản', price: 320000, cmp: 360000, disc: 11, isGift: 0, emoji: '🍎', desc: 'Thịt táo chứa lõi mật ngọt lịm, hương thơm nồng nàn quyến rũ đặc trưng xứ sở hoa anh đào.' },
    { id: 53, name: 'Táo Ambrosia Mỹ Giòn Mật', slug: 'tao-ambrosia-my', cat: 6, origin: 'Mỹ', price: 169000, cmp: 195000, disc: 13, isGift: 0, emoji: '🍎', desc: 'Thức ăn của các vị thần Hy Lạp - vị ngọt mật ong tự nhiên, vỏ mỏng không sáp.' },
    { id: 54, name: 'Táo Xanh Granny Smith Mỹ Giàu Chất Xơ', slug: 'tao-xanh-granny-smith-my', cat: 6, origin: 'Mỹ', price: 149000, cmp: 175000, disc: 15, isGift: 0, emoji: '🍏', desc: 'Vị chua giòn sảng khoái, lựa chọn số 1 cho nước ép detox giảm cân giữ dáng.' },
    { id: 55, name: 'Táo Koru New Zealand Đậm Đà', slug: 'tao-koru-new-zealand', cat: 6, origin: 'New Zealand', price: 219000, cmp: 250000, disc: 12, isGift: 0, emoji: '🍎', desc: 'Màu vàng cam điểm sọc đỏ cam ấm áp, vị chua ngọt đan xen hài hòa đỉnh cao.' },
    { id: 56, name: 'Táo Kinsei Vàng Nhật Bản Thơm Hương Chuối', slug: 'tao-kinsei-vang-nhat-ban', cat: 6, origin: 'Nhật Bản', price: 390000, cmp: 440000, disc: 11, isGift: 0, emoji: '🍏', desc: 'Táo vàng kim ánh sao, thơm thoang thoảng hương chuối chín và hoa nhài quý tộc.' },
    { id: 57, name: 'Táo Envy Mỹ Size 30 Hộp Quà 3 Quả', slug: 'tao-envy-my-hop-3-qua', cat: 6, origin: 'Mỹ', price: 260000, cmp: 295000, disc: 12, isGift: 0, emoji: '🍎', desc: 'Đóng hộp giấy kraft cao cấp Klever Fruit, món quà tinh tế cho đồng nghiệp.' },

    // Category 7: Lê Hàn & Lê Nhật Bản (8 món)
    { id: 58, name: 'Lê Hàn Quốc VIP Singo Quả 900g', slug: 'le-han-quoc-vip-singo', cat: 7, origin: 'Hàn Quốc', price: 209000, cmp: 319000, disc: 34, isGift: 0, emoji: '🍐', desc: 'Lê quả tròn lớn thịt trắng phau giòn ngọt sắc, thơm thanh khiết bồi bổ hô hấp.' },
    { id: 59, name: 'Lê Nhật Bản Giống Hosui Mọng Nước', slug: 'le-nhat-ban-giong-hosui', cat: 7, origin: 'Nhật Bản', price: 219000, cmp: 260000, disc: 16, isGift: 0, emoji: '🍐', desc: 'Lê mọng nước tan chảy, ngọt mát dịu dàng, ăn giải nhiệt những ngày hanh hao.' },
    { id: 60, name: 'Lê Nâu Hàn Quốc Hộp Quà 2 Quả', slug: 'le-nau-han-quoc-hop-2-qua', cat: 7, origin: 'Hàn Quốc', price: 250000, cmp: 290000, disc: 14, isGift: 0, emoji: '🍐', desc: 'Hộp quà lịch sự biếu tặng, quả tròn đều không một vết thâm cấn.' },
    { id: 61, name: 'Lê Thiên Đường Shingo Nhật Bản Quả 1kg', slug: 'le-thien-duong-shingo-nhat', cat: 7, origin: 'Nhật Bản', price: 420000, cmp: 480000, disc: 13, isGift: 0, emoji: '🍐', desc: 'Quả khổng lồ 1kg vị ngọt 14 brix quý phái như mật ngọt thiên nhiên ban tặng.' },
    { id: 62, name: 'Lê Nam Phi Má Hồng Forelle', slug: 'le-nam-phi-ma-hong-forelle', cat: 7, origin: 'Nam Phi', price: 139000, cmp: 165000, disc: 16, isGift: 0, emoji: '🍐', desc: 'Lê mini má ửng hồng xinh xắn, thịt chắc ngọt dẻo thơm mát bùi.' },
    { id: 63, name: 'Lê Xanh D’Anjou Mỹ Mềm Dẻo', slug: 'le-xanh-danjou-my', cat: 7, origin: 'Mỹ', price: 169000, cmp: 195000, disc: 13, isGift: 0, emoji: '🍐', desc: 'Dáng giọt nước thanh tú, khi chín mềm thơm nức mũi mùi bơ tươi.' },
    { id: 64, name: 'Lê Hàn Quốc Thùng VIP 10 Quả (7.5kg)', slug: 'le-han-quoc-thung-10-qua', cat: 7, origin: 'Hàn Quốc', price: 999000, cmp: 1200000, disc: 17, isGift: 0, emoji: '🍐', desc: 'Nguyên thùng quà biếu sang xịn, đầy đủ tem mác kiểm dịch chính ngạch.' },
    { id: 65, name: 'Lê Nhật Nijisseiki (Lê Thế Kỷ 20)', slug: 'le-nhat-nijisseiki', cat: 7, origin: 'Nhật Bản', price: 290000, cmp: 340000, disc: 15, isGift: 0, emoji: '🍐', desc: 'Vỏ xanh vàng óng ánh, vị chua ngọt cân bằng tinh xảo.' },

    // Category 8: Dâu Tây & Quả Mọng (9 món)
    { id: 66, name: 'Dâu Tây Hàn Quốc Seolhyang Hộp 330g', slug: 'dau-tay-han-quoc-seolhyang-330g', cat: 8, origin: 'Hàn Quốc', price: 349000, cmp: 399000, disc: 13, isGift: 0, emoji: '🍓', desc: 'Dâu tây thơm nức cả gian phòng, cuống xanh mơn mởn vận chuyển đường bay 24h.' },
    { id: 67, name: 'Dâu Tây Bạch Tuyết Nhật Bản Hộp VIP 9 Quả', slug: 'dau-tay-bach-tuyet-nhat-ban', cat: 8, origin: 'Nhật Bản', price: 890000, cmp: 990000, disc: 10, isGift: 0, emoji: '🍓', desc: 'Dâu trắng muốt hạt đỏ như tuyết rơi mùa đông, mùi thơm vị dứa và caramen ngọt lịm.' },
    { id: 68, name: 'Dâu Tây Tochiotome Nhật Bản Hộp Quà', slug: 'dau-tay-tochiotome-nhat-ban', cat: 8, origin: 'Nhật Bản', price: 650000, cmp: 750000, disc: 13, isGift: 0, emoji: '🍓', desc: 'Giống dâu nổi tiếng vùng Tochigi, quả thuôn dài, màu đỏ ruby mọng nước.' },
    { id: 69, name: 'Dâu Tây Hana Mộc Châu Tuyển Chọn Hộp 500g', slug: 'dau-tay-hana-moc-chau', cat: 8, origin: 'Việt Nam', price: 195000, cmp: 230000, disc: 15, isGift: 0, emoji: '🍓', desc: 'Trồng theo công nghệ Nhật trên cao nguyên Mộc Châu, ngọt thơm đậm đà.' },
    { id: 70, name: 'Mâm Xôi Đỏ Mỹ Tươi (Raspberry) Hộp 125g', slug: 'mam-xoi-do-my-125g', cat: 8, origin: 'Mỹ', price: 185000, cmp: 215000, disc: 14, isGift: 0, emoji: '🫐', desc: 'Trái mọng mềm mịn như nhung, giàu vitamin C và chất chống lão hóa.' },
    { id: 71, name: 'Mâm Xôi Đen Mỹ Tươi (Blackberry) Hộp 125g', slug: 'mam-xoi-den-my-125g', cat: 8, origin: 'Mỹ', price: 195000, cmp: 225000, disc: 13, isGift: 0, emoji: '🫐', desc: 'Quả đen mọng óng ả, vị thanh tao dùng làm bánh hoặc ăn kèm sữa chua granola.' },
    { id: 72, name: 'Dâu Tây King Hàn Quốc Hộp VIP 500g', slug: 'dau-tay-king-han-quoc-500g', cat: 8, origin: 'Hàn Quốc', price: 580000, cmp: 680000, disc: 15, isGift: 0, emoji: '🍓', desc: 'Size King khổng lồ gấp rưỡi dâu thường, cắn ngập miệng ngọt lịm thơm ngát.' },
    { id: 73, name: 'Dâu Tây Úc Mùa Hè Hộp 250g', slug: 'dau-tay-uc-mua-he', cat: 8, origin: 'Úc', price: 210000, cmp: 245000, disc: 14, isGift: 0, emoji: '🍓', desc: 'Trồng tại trang trại bang Victoria, quả cứng cáp vận chuyển hoàn hảo.' },
    { id: 74, name: 'Combo Quả Mọng 3 Món (Dâu + Việt Quất + Mâm Xôi)', slug: 'combo-qua-mong-3-mon', cat: 8, origin: 'Đa quốc gia', price: 499000, cmp: 580000, disc: 14, isGift: 0, emoji: '🍓', desc: 'Bộ ba chống lão hóa đỉnh cao bồi bổ nhan sắc và tăng cường thị lực.' },

    // Category 9: Việt Quất Tươi (7 món)
    { id: 75, name: 'Việt Quất Úc Tươi Hộp 125g', slug: 'viet-quat-uc-tuoi-125g', cat: 9, origin: 'Úc', price: 199000, cmp: 250000, disc: 20, isGift: 0, emoji: '🫐', desc: 'Việt quất nhập khẩu đường bay, phủ phấn trắng tự nhiên, giàu anthocyanin.' },
    { id: 76, name: 'Việt Quất Mỹ Size Jumbo Hộp 125g', slug: 'viet-quat-my-size-jumbo-125g', cat: 9, origin: 'Mỹ', price: 225000, cmp: 260000, disc: 13, isGift: 0, emoji: '🫐', desc: 'Size khổng lồ quả cứng giòn rụm, ngọt đậm đà vị núi rừng Bắc Mỹ.' },
    { id: 77, name: 'Việt Quất New Zealand Tươi Hộp 125g', slug: 'viet-quat-new-zealand-125g', cat: 9, origin: 'New Zealand', price: 215000, cmp: 250000, disc: 14, isGift: 0, emoji: '🫐', desc: 'Đón nhận nguồn nước và thổ nhưỡng tinh khôi hàng đầu bán cầu Nam.' },
    { id: 78, name: 'Việt Quất Peru Hộp 125g Tuyển Chọn', slug: 'viet-quat-peru-hop-125g', cat: 9, origin: 'Peru', price: 169000, cmp: 199000, disc: 15, isGift: 0, emoji: '🫐', desc: 'Vụ mùa năng suất cao, giá cả phải chăng cho tín đồ ăn kiêng eat clean.' },
    { id: 79, name: 'Việt Quất Úc Combo 3 Hộp (375g)', slug: 'viet-quat-uc-combo-3-hop', cat: 9, origin: 'Úc', price: 569000, cmp: 650000, disc: 12, isGift: 0, emoji: '🫐', desc: 'Tiết kiệm hơn khi mua theo set gia đình dùng trọn tuần lễ.' },
    { id: 80, name: 'Việt Quất Mỹ Thùng Nguyên 12 Hộp (1.5kg)', slug: 'viet-quat-my-thung-12-hop', cat: 9, origin: 'Mỹ', price: 1194000, cmp: 1390000, disc: 14, isGift: 0, emoji: '🫐', desc: 'Nguyên thùng giữ lạnh phục vụ biếu tặng và tiệc sinh nhật.' },
    { id: 81, name: 'Việt Quất Hữu Cơ Organic Mỹ Hộp 125g', slug: 'viet-quat-organic-my', cat: 9, origin: 'Mỹ', price: 260000, cmp: 300000, disc: 13, isGift: 0, emoji: '🫐', desc: 'Đạt chứng nhận hữu cơ USDA không phân bón hóa học, an toàn tuyệt đối.' },

    // Category 10: Kiwi New Zealand (8 món)
    { id: 82, name: 'Kiwi Vàng Zespri New Zealand SunGold', slug: 'kiwi-vang-zespri-new-zealand', cat: 10, origin: 'New Zealand', price: 189000, cmp: 219000, disc: 14, isGift: 0, emoji: '🥝', desc: 'Kiwi vàng ruột vàng óng, thịt mềm mọng ngọt ngào gấp 3 lần vitamin C của cam.' },
    { id: 83, name: 'Kiwi Xanh Zespri New Zealand Giàu Chất Xơ', slug: 'kiwi-xanh-zespri-new-zealand', cat: 10, origin: 'New Zealand', price: 139000, cmp: 160000, disc: 13, isGift: 0, emoji: '🥝', desc: 'Kiwi xanh chua thanh ngọt dịu, giàu enzyme actinidin hỗ trợ tiêu hóa nhẹ nhàng.' },
    { id: 84, name: 'Kiwi Đỏ Zespri Ruby Red New Zealand', slug: 'kiwi-do-zespri-ruby-red', cat: 10, origin: 'New Zealand', price: 260000, cmp: 310000, disc: 16, isGift: 0, emoji: '🥝', desc: 'Tuyệt phẩm giống mới ruột đỏ thắm hương quả mọng berry quý phái.' },
    { id: 85, name: 'Kiwi Vàng Zespri Thùng 3.2kg (22-25 quả)', slug: 'kiwi-vang-thung-3-2kg', cat: 10, origin: 'New Zealand', price: 590000, cmp: 690000, disc: 14, isGift: 0, emoji: '🥝', desc: 'Nguyên thùng tươi nguyên tem Zespri chính hãng ăn thả ga tiết kiệm.' },
    { id: 86, name: 'Kiwi Xanh Zespri Thùng 3.2kg', slug: 'kiwi-xanh-thung-3-2kg', cat: 10, origin: 'New Zealand', price: 430000, cmp: 500000, disc: 14, isGift: 0, emoji: '🥝', desc: 'Lựa chọn dinh dưỡng lành mạnh cho gia đình duy trì hệ miễn dịch khỏe khoắn.' },
    { id: 87, name: 'Kiwi Vàng Hữu Cơ Zespri Organic', slug: 'kiwi-vang-zespri-organic', cat: 10, origin: 'New Zealand', price: 240000, cmp: 280000, disc: 14, isGift: 0, emoji: '🥝', desc: 'Tiêu chuẩn canh tác sinh thái bảo vệ môi trường, vị ngọt thanh khiết.' },
    { id: 88, name: 'Kiwi Mini Baby Nhập Khẩu New Zealand Hộp 500g', slug: 'kiwi-mini-baby-500g', cat: 10, origin: 'New Zealand', price: 165000, cmp: 190000, disc: 13, isGift: 0, emoji: '🥝', desc: 'Quả nhỏ xinh không lông, ăn cả vỏ thơm ngon ngọt mát tiện lợi cho bé.' },
    { id: 89, name: 'Kiwi Vàng Hộp Quà 6 Quả Kèm Muỗng Nạo Zespri', slug: 'kiwi-vang-hop-6-qua', cat: 10, origin: 'New Zealand', price: 175000, cmp: 200000, disc: 13, isGift: 0, emoji: '🥝', desc: 'Tặng kèm muỗng cắt nạo thông minh chuẩn Zespri mang theo du lịch.' },

    // Category 11: Mận & Xuân Đào (8 món)
    { id: 90, name: 'Mận An Lộc Chile Size Jumbo', slug: 'man-an-loc-chile-jumbo', cat: 11, origin: 'Chile', price: 320000, cmp: 360000, disc: 11, isGift: 0, emoji: '🍑', desc: 'Mận đen quả to tròn, vỏ phủ phấn tuyết, cắn ngập miệng giòn rụm ngọt lịm.' },
    { id: 91, name: 'Đào Dẹt Tây Ban Nha (Donut Peach)', slug: 'dao-det-tay-ban-nha-donut', cat: 11, origin: 'Tây Ban Nha', price: 380000, cmp: 420000, disc: 10, isGift: 0, emoji: '🍑', desc: 'Đào hình tròn dẹt ngộ nghĩnh, hương thơm nồng nàn, hạt bé tí teo ngọt đậm.' },
    { id: 92, name: 'Đào Vàng Úc Cao Cấp Thơm Ngọt', slug: 'dao-vang-uc-cao-cap', cat: 11, origin: 'Úc', price: 290000, cmp: 330000, disc: 12, isGift: 0, emoji: '🍑', desc: 'Đào vàng thịt vàng giòn ngọt, vỏ ửng đỏ đẹp mắt và thơm thảo.' },
    { id: 93, name: 'Xuân Đào Úc Thịt Trắng (White Nectarine)', slug: 'xuan-dao-uc-thit-trang', cat: 11, origin: 'Úc', price: 280000, cmp: 320000, disc: 13, isGift: 0, emoji: '🍑', desc: 'Vỏ láng mịn không lông, thịt trắng tinh khôi, vị ngọt ngào như mật hoa.' },
    { id: 94, name: 'Xuân Đào Úc Thịt Vàng (Yellow Nectarine)', slug: 'xuan-dao-uc-thit-vang', cat: 11, origin: 'Úc', price: 270000, cmp: 310000, disc: 13, isGift: 0, emoji: '🍑', desc: 'Vị chua ngọt đan xen giòn sần sật, dồi dào carotene cho đôi mắt sáng ngời.' },
    { id: 95, name: 'Mận Xanh Sweet Green Mỹ Siêu Giòn', slug: 'man-xanh-sweet-green-my', cat: 11, origin: 'Mỹ', price: 350000, cmp: 395000, disc: 11, isGift: 0, emoji: '🍑', desc: 'Vỏ xanh ruột vàng hổ phách, độ giòn rôm rốp không hề có vị chát.' },
    { id: 96, name: 'Đào Trắng Nhật Bản Giống Hakuho Hộp 2 Quả VIP', slug: 'dao-trang-nhat-ban-hakuho', cat: 11, origin: 'Nhật Bản', price: 680000, cmp: 780000, disc: 13, isGift: 0, emoji: '🍑', desc: 'Đào tiên tráng miệng thượng phẩm Nhật Bản, mềm mọng thơm lừng ngất ngây.' },
    { id: 97, name: 'Mận Đỏ Sugar Plum Úc Hộp 500g', slug: 'man-do-sugar-plum-uc', cat: 11, origin: 'Úc', price: 180000, cmp: 210000, disc: 14, isGift: 0, emoji: '🍑', desc: 'Mận đường quả nhỏ xinh vị ngọt sắc bọc lớp phấn bạc tự nhiên.' },

    // Category 12: Cam Quýt Ngoại Nhập (9 món)
    { id: 98, name: 'Cam Cara Cara Ruột Đỏ Úc Không Hạt', slug: 'cam-cara-cara-ruot-do-uc', cat: 12, origin: 'Úc', price: 169000, cmp: 199000, disc: 15, isGift: 0, emoji: '🍊', desc: 'Cam ruột hồng đỏ giàu lycopene, mọng nước và không hề chua gắt.' },
    { id: 99, name: 'Cam Navel Vàng Úc Ngọt Đậm', slug: 'cam-navel-vang-uc', cat: 12, origin: 'Úc', price: 139000, cmp: 160000, disc: 13, isGift: 0, emoji: '🍊', desc: 'Cam rốn Navel nổi tiếng mọng nước, vỏ mỏng dễ bóc ăn tráng miệng tuyệt vời.' },
    { id: 100, name: 'Quýt Úc 2PH Cao Cấp Mọng Nước', slug: 'quyt-uc-2ph-cao-cap', cat: 12, origin: 'Úc', price: 199000, cmp: 230000, disc: 13, isGift: 0, emoji: '🍊', desc: 'Quýt thương hiệu 2PH thượng đỉnh, múi mọng căng tràn tép ngọt đậm đà.' },
    { id: 101, name: 'Cam Vàng Sunkist Navel Mỹ', slug: 'cam-vang-sunkist-navel-my', cat: 12, origin: 'Mỹ', price: 149000, cmp: 175000, disc: 15, isGift: 0, emoji: '🍊', desc: 'Thương hiệu Sunkist huyền thoại, vị thơm cam đặc trưng chuyên vắt nước bổ sung đề kháng.' },
    { id: 102, name: 'Quýt Nhật Unshu Không Hạt Ngọt Thanh', slug: 'quyt-nhat-unshu', cat: 12, origin: 'Nhật Bản', price: 390000, cmp: 450000, disc: 13, isGift: 0, emoji: '🍊', desc: 'Quýt Unshu Nhật vỏ mỏng dính bóc dễ dàng, tép vàng ươm ngọt lịm tan chảy.' },
    { id: 103, name: 'Quýt Đường Nam Phi ClemenGold', slug: 'quyt-duong-nam-phi-clemengold', cat: 12, origin: 'Nam Phi', price: 179000, cmp: 210000, disc: 15, isGift: 0, emoji: '🍊', desc: 'Dòng quýt ClemenGold đạt chuẩn quốc tế, không hạt và thơm ngát hương tinh dầu.' },
    { id: 104, name: 'Cam Ruột Đỏ Huyết Máu Blood Orange Mỹ', slug: 'cam-huyet-mau-blood-orange-my', cat: 12, origin: 'Mỹ', price: 210000, cmp: 245000, disc: 14, isGift: 0, emoji: '🍊', desc: 'Ruột đỏ tía bí ẩn hương quả mọng, lượng chất chống oxy hóa vượt trội.' },
    { id: 105, name: 'Quýt Úc Afourer Dễ Bóc Hộp 1kg', slug: 'quyt-uc-afourer-1kg', cat: 12, origin: 'Úc', price: 185000, cmp: 215000, disc: 14, isGift: 0, emoji: '🍊', desc: 'Múi dầy đanh, tép nước bóng bẩy thích hợp làm món ăn dặm cho trẻ em.' },
    { id: 106, name: 'Cam Navel Úc Thùng 18kg Tiết Kiệm', slug: 'cam-navel-uc-thung-18kg', cat: 12, origin: 'Úc', price: 1950000, cmp: 2400000, disc: 19, isGift: 0, emoji: '🍊', desc: 'Thùng lớn cho quán cafe cao cấp hoặc đại gia đình vắt cam cả tháng.' },

    // Category 13: Trái Cây Đặc Sản Việt Nam (10 món)
    { id: 107, name: 'Bưởi Da Xanh Bến Tre Tuyển Chọn Loại 1', slug: 'buoi-da-xanh-ben-tre-loai-1', cat: 13, origin: 'Việt Nam', price: 120000, cmp: 140000, disc: 14, isGift: 0, emoji: '🍈', desc: 'Bưởi da xanh vỏ mỏng, tép hồng đỏ bó chặt mọng nước, vị ngọt thanh không the.' },
    { id: 108, name: 'Xoài Cát Hòa Lộc Tiền Giang Xuất Khẩu', slug: 'xoai-cat-hoa-loc-tien-giang', cat: 13, origin: 'Việt Nam', price: 150000, cmp: 175000, disc: 14, isGift: 0, emoji: '🥭', desc: 'Xoài cát da vàng mịn thơm ngát, thịt chắc mịn không xơ ngọt đậm.' },
    { id: 109, name: 'Sầu Riêng Ri6 Chín Tự Nhiên Cơm Vàng Hạt Lép', slug: 'sau-rieng-ri6-chin-tu-nhien', cat: 13, origin: 'Việt Nam', price: 180000, cmp: 210000, disc: 14, isGift: 0, emoji: '🍈', desc: 'Bao ăn từng múi 1 đổi 1, cơm vàng dẻo béo ngậy thơm nức mũi.' },
    { id: 110, name: 'Măng Cụt Cái Mơn Bến Tre Ruột Trong', slug: 'mang-cut-cai-mon-ben-tre', cat: 13, origin: 'Việt Nam', price: 135000, cmp: 160000, disc: 16, isGift: 0, emoji: '🥥', desc: 'Nữ hoàng trái cây nhiệt đới, múi trắng ngần như hoa bưởi chua ngọt dịu dàng.' },
    { id: 111, name: 'Vải Thiều Lục Ngạn Bắc Giang Cành Đẹp', slug: 'vai-thieu-luc-ngan-bac-giang', cat: 13, origin: 'Việt Nam', price: 95000, cmp: 120000, disc: 21, isGift: 0, emoji: '🔴', desc: 'Vải tiến vua nức tiếng quả tròn mọng, cùi dày hạt nhỏ nước ngọt lịm.' },
    { id: 112, name: 'Nhãn Lồng Hưng Yên Cùi Dày Hạt Tiêu', slug: 'nhan-long-hung-yen', cat: 13, origin: 'Việt Nam', price: 110000, cmp: 130000, disc: 15, isGift: 0, emoji: '🟤', desc: 'Đặc sản tiến vua xứ nhãn, cùi lồng giòn sần sật thơm nồng vị thanh.' },
    { id: 113, name: 'Thanh Long Ruột Đỏ Bình Thuận', slug: 'thanh-long-ruot-do-binh-thuan', cat: 13, origin: 'Việt Nam', price: 65000, cmp: 80000, disc: 19, isGift: 0, emoji: '🐉', desc: 'Ruột đỏ tía ngọt mát đậm đà giàu chất xơ hỗ trợ tim mạch và tiêu hóa.' },
    { id: 114, name: 'Bơ Sáp 034 Lâm Đồng Cơm Dẻo', slug: 'bo-sap-034-lam-dong', cat: 13, origin: 'Việt Nam', price: 85000, cmp: 105000, disc: 19, isGift: 0, emoji: '🥑', desc: 'Dáng dài quả chắc thịt vàng óng dẻo quánh như phô mai béo ngậy.' },
    { id: 115, name: 'Dừa Xiêm Xanh Bến Tre Ngọt Thanh', slug: 'dua-xiem-xanh-ben-tre', cat: 13, origin: 'Việt Nam', price: 35000, cmp: 45000, disc: 22, isGift: 0, emoji: '🥥', desc: 'Nước dừa ngọt lịm bù điện giải tự nhiên những ngày hè nóng nực.' },
    { id: 116, name: 'Chôm Chôm Nhãn Bến Tre Giòn Róc Hạt', slug: 'chom-chom-nhan-ben-tre', cat: 13, origin: 'Việt Nam', price: 75000, cmp: 90000, disc: 17, isGift: 0, emoji: '🔴', desc: 'Râu ngắn vàng ửng, cùi giòn róc hạt thơm ngát mùi nhãn lồng.' },

    // Category 14: Trái Cây Cắt Sẵn Tiện Lợi (8 món)
    { id: 117, name: 'Khay Trái Cây Party Box Cao Cấp 1.2kg', slug: 'khay-trai-cay-party-box-1-2kg', cat: 14, origin: 'Klever Fresh', price: 350000, cmp: 400000, disc: 12, isGift: 0, emoji: '🍱', desc: 'Kết hợp 5 loại trái cây thượng hạng cắt sẵn tiện lợi phục vụ hội nghị, liên hoan văn phòng.' },
    { id: 118, name: 'Ly Trái Cây Tươi Cắt Sẵn Healthy Cup 350g', slug: 'ly-trai-cay-tuoi-healthy-cup', cat: 14, origin: 'Klever Fresh', price: 65000, cmp: 75000, disc: 13, isGift: 0, emoji: '🥤', desc: 'Ly hoa quả tiện lợi dùng liền kèm nĩa và sốt muối ớt đặc biệt của Klever.' },
    { id: 119, name: 'Hộp Dưa Lưới Musk Melon Nhật Cắt Sẵn 500g', slug: 'hop-dua-luoi-musk-melon-cat-san', cat: 14, origin: 'Klever Fresh', price: 165000, cmp: 190000, disc: 13, isGift: 0, emoji: '🍈', desc: 'Dưa lưới thơm ngát ướp lạnh sẵn sàng cho bữa tiệc tráng miệng nhanh.' },
    { id: 120, name: 'Hộp Trái Cây Mix 4 Món (Nho + Kiwi + Dưa + Táo)', slug: 'hop-trai-cay-mix-4-mon', cat: 14, origin: 'Klever Fresh', price: 120000, cmp: 140000, disc: 14, isGift: 0, emoji: '🍱', desc: 'Bữa xế văn phòng thanh đạm giàu năng lượng không lo tăng cân.' },
    { id: 121, name: 'Hộp Bưởi Da Xanh Tách Múi Sẵn Sàng 500g', slug: 'hop-buoi-da-xanh-tach-mui', cat: 14, origin: 'Klever Fresh', price: 95000, cmp: 110000, disc: 14, isGift: 0, emoji: '🍈', desc: 'Từng tép bưởi hồng tách sạch màng đắng kèm muối tôm Tây Ninh hảo hạng.' },
    { id: 122, name: 'Hộp Thanh Long & Kiwi Cắt Hạt Lựu Salad', slug: 'hop-thanh-long-kiwi-salad', cat: 14, origin: 'Klever Fresh', price: 85000, cmp: 100000, disc: 15, isGift: 0, emoji: '🥗', desc: 'Chuẩn bị hoàn hảo cho món salad trộn sốt sữa chua mè rang tại nhà.' },
    { id: 123, name: 'Khay Hoa Quả VIP Hội Nghị Ban Lãnh Đạo 2kg', slug: 'khay-hoa-qua-vip-hoi-nghi-2kg', cat: 14, origin: 'Klever Fresh', price: 690000, cmp: 800000, disc: 14, isGift: 0, emoji: '🍱', desc: 'Bao gồm Cherry Mỹ, Nho mẫu đơn, Táo Envy và Dâu tây cao cấp xếp tầng nghệ thuật.' },
    { id: 124, name: 'Cốc Trái Cây Sữa Chua Granola Bữa Sáng', slug: 'coc-trai-cay-sua-chua-granola', cat: 14, origin: 'Klever Fresh', price: 79000, cmp: 95000, disc: 17, isGift: 0, emoji: '🥣', desc: 'Khởi đầu ngày mới tỉnh táo với sữa chua Hy Lạp, hoa quả tươi và hạt dinh dưỡng sấy giòn.' },

    // Category 15: Nước Ép & Đồ Uống Tươi (8 món)
    { id: 125, name: 'Nước Ép Lựu Đỏ Nguyên Chất Klever 330ml', slug: 'nuoc-ep-luu-do-klever-330ml', cat: 15, origin: 'Klever Juice', price: 95000, cmp: 110000, disc: 14, isGift: 0, emoji: '🥤', desc: 'Ép lạnh 100% từ lựu nhập khẩu, không đường tinh luyện, không chất bảo quản.' },
    { id: 126, name: 'Nước Ép Táo Envy & Cần Tây Detox 330ml', slug: 'nuoc-ep-tao-envy-can-tay', cat: 15, origin: 'Klever Juice', price: 75000, cmp: 85000, disc: 12, isGift: 0, emoji: '🥤', desc: 'Thanh lọc cơ thể, giữ dáng sáng da với công thức tỉ lệ vàng từ chuyên gia dinh dưỡng.' },
    { id: 127, name: 'Nước Ép Cam Cara & Cà Rốt Tươi 330ml', slug: 'nuoc-ep-cam-cara-ca-rot', cat: 15, origin: 'Klever Juice', price: 65000, cmp: 75000, disc: 13, isGift: 0, emoji: '🥤', desc: 'Tăng cường thị lực và hệ miễn dịch với hàm lượng vitamin A & C dồi dào.' },
    { id: 128, name: 'Nước Ép Cherry Tươi Cold-Pressed 330ml VIP', slug: 'nuoc-ep-cherry-tuoi-cold-pressed', cat: 15, origin: 'Klever Juice', price: 145000, cmp: 170000, disc: 15, isGift: 0, emoji: '🥤', desc: 'Nước ép đắt đỏ nhất từ những quả cherry Mỹ mọng nước, ngủ ngon và chống viêm khớp.' },
    { id: 129, name: 'Nước Ép Dưa Hấu & Bạc Hà Mát Lạnh 330ml', slug: 'nuoc-ep-dua-hau-bac-ha', cat: 15, origin: 'Klever Juice', price: 55000, cmp: 65000, disc: 15, isGift: 0, emoji: '🥤', desc: 'Hạ nhiệt tức thì những ngày nắng nóng hanh khô của thủ đô.' },
    { id: 130, name: 'Nước Ép Bưởi Da Xanh & Mật Ong Rừng 330ml', slug: 'nuoc-ep-buoi-mat-ong', cat: 15, origin: 'Klever Juice', price: 68000, cmp: 80000, disc: 15, isGift: 0, emoji: '🥤', desc: 'Đốt mỡ tự nhiên, vị đắng ngọt nhẹ hòa quyện mật ong hoa cà phê thơm mát.' },
    { id: 131, name: 'Sinh Tố Bơ 034 Sữa Hạnh Nhân 350ml', slug: 'sinh-to-bo-034-sua-hanh-nhan', cat: 15, origin: 'Klever Juice', price: 79000, cmp: 90000, disc: 12, isGift: 0, emoji: '🥤', desc: 'Món sinh tố béo ngậy healthy hoàn toàn từ hạt thực vật cao cấp.' },
    { id: 132, name: 'Gói Nước Ép Detox Liệu Trình 3 Ngày (6 Chai)', slug: 'goi-detox-3-ngay-6-chai', cat: 15, origin: 'Klever Juice', price: 399000, cmp: 460000, disc: 13, isGift: 0, emoji: '🥤', desc: 'Liệu trình detox thanh lọc gan thận được thiết kế khoa học giao tươi mỗi sớm.' },

    // Category 16: Gift Card Thẻ Quà Tặng (6 món)
    { id: 133, name: 'Thẻ Quà Tặng Klever Fruit 200.000₫', slug: 'gift-card-klever-fruit-200k', cat: 16, origin: 'Klever Fruit', price: 200000, cmp: null, disc: 0, isGift: 0, emoji: '💳', desc: 'Thẻ quà tặng điện tử áp dụng cho toàn bộ chuỗi 22 cửa hàng và đặt online.' },
    { id: 134, name: 'Thẻ Quà Tặng Klever Fruit 500.000₫', slug: 'gift-card-klever-fruit-500k', cat: 16, origin: 'Klever Fruit', price: 500000, cmp: null, disc: 0, isGift: 0, emoji: '💳', desc: 'Thẻ quà tặng cao cấp tặng đối tác và bạn bè tri ân dịp sinh nhật.' },
    { id: 135, name: 'Thẻ Quà Tặng Klever Fruit 1.000.000₫', slug: 'gift-card-klever-fruit-1000k', cat: 16, origin: 'Klever Fruit', price: 1000000, cmp: null, disc: 0, isGift: 0, emoji: '💳', desc: 'Tặng thẻ quà tặng mệnh giá 1 triệu đồng tri ân khách hàng thân thiết.' },
    { id: 136, name: 'Thẻ Quà Tặng Klever Fruit 2.000.000₫', slug: 'gift-card-klever-fruit-2000k', cat: 16, origin: 'Klever Fruit', price: 2000000, cmp: null, disc: 0, isGift: 0, emoji: '💳', desc: 'Thẻ quà tặng VIP cao cấp nhất của Klever Fruit.' },
    { id: 137, name: 'Thẻ Quà Tặng Doanh Nghiệp VIP 5.000.000₫', slug: 'gift-card-doanh-nghiep-5000k', cat: 16, origin: 'Klever Fruit', price: 5000000, cmp: null, disc: 0, isGift: 0, emoji: '💳', desc: 'Mệnh giá lớn kèm đặc quyền tặng mã ưu đãi và dịch vụ giao hàng ưu tiên trọn năm.' },
    { id: 138, name: 'Thẻ Membership Diamond Đặc Quyền Klever', slug: 'the-membership-diamond-klever', cat: 16, origin: 'Klever Fruit', price: 3000000, cmp: null, disc: 0, isGift: 0, emoji: '💎', desc: 'Thẻ thành viên Kim Cương nâng hạng tích lũy 10% điểm thưởng trên mọi đơn hàng.' },

    // Category 17: Combo Vitamin Gia Đình 3 - 5 Người (9 món)
    { id: 139, name: 'Set Vitamin Gia Đình: Thứ Hai Khởi Đầu Mới', slug: 'set-vitamin-thu-hai-khoi-dau', cat: 17, origin: 'Đa quốc gia', price: 1776000, cmp: 1990000, disc: 11, isGift: 0, emoji: '🥗', desc: 'Nạp tràn trề năng lượng cho tuần làm việc mới rực rỡ với táo Envy, cam vàng và kiwi xanh.' },
    { id: 140, name: 'Set Vitamin Gia Đình: Thứ Ba Khỏe Khoắn', slug: 'set-vitamin-thu-ba-khoe-khoan', cat: 17, origin: 'Đa quốc gia', price: 1744000, cmp: 1950000, disc: 11, isGift: 0, emoji: '🥗', desc: 'Cân bằng dinh dưỡng bữa trưa và bữa xế cho cả nhà với nho mẫu đơn và dâu tây.' },
    { id: 141, name: 'Set Vitamin Gia Đình: Thứ Tư Thanh Lọc', slug: 'set-vitamin-thu-tu-thanh-loc', cat: 17, origin: 'Đa quốc gia', price: 1609000, cmp: 1800000, disc: 11, isGift: 0, emoji: '🥗', desc: 'Set trái cây ít calo giàu chất xơ: táo xanh, kiwi vàng, bưởi da xanh mát lành.' },
    { id: 142, name: 'Set Vitamin Gia Đình: Thứ Năm Năng Lượng', slug: 'set-vitamin-thu-nam-nang-luong', cat: 17, origin: 'Đa quốc gia', price: 2069000, cmp: 2300000, disc: 10, isGift: 0, emoji: '🥗', desc: 'Tươi mát, ngọt lành, tiếp sức ngày làm việc cuối tuần đầy nhiệt huyết.' },
    { id: 143, name: 'Set Vitamin Gia Đình: Thứ Sáu Hứng Khởi', slug: 'set-vitamin-thu-sau-hung-khoi', cat: 17, origin: 'Đa quốc gia', price: 2135000, cmp: 2400000, disc: 11, isGift: 0, emoji: '🥗', desc: 'Set bồi bổ tăng cường miễn dịch gồm việt quất, cam cara ruột đỏ và lê Hàn Quốc.' },
    { id: 144, name: 'Set Vitamin Gia Đình: Thứ Bảy Trọn Vẹn', slug: 'set-vitamin-thu-bay-tron-ven', cat: 17, origin: 'Đa quốc gia', price: 2736000, cmp: 3000000, disc: 9, isGift: 0, emoji: '🥗', desc: 'Bổ sung đầy đủ vitamin A, C, E và khoáng chất cho cả gia đình ngày thứ Bảy sum họp.' },
    { id: 145, name: 'Set Vitamin Gia Đình: Chủ Nhật Vui Vẻ', slug: 'set-vitamin-chu-nhat-vui-ve', cat: 17, origin: 'Đa quốc gia', price: 1804000, cmp: 2000000, disc: 10, isGift: 0, emoji: '🥗', desc: 'Set trái cây tươi bồi bổ năng lượng cuối tuần gồm nho mẫu đơn, táo envy, kiwi vàng.' },
    { id: 146, name: 'Combo Tuần Lễ Gia Đình 3 Người Tiết Kiệm', slug: 'combo-tuan-gia-dinh-3-nguoi', cat: 17, origin: 'Đa quốc gia', price: 990000, cmp: 1150000, disc: 14, isGift: 0, emoji: '👨‍👩‍👧', desc: 'Trọn gói trái cây 7 ngày cho gia đình nhỏ 3 thành viên giao làm 2 đợt giữ độ tươi giòn.' },
    { id: 147, name: 'Combo Đề Kháng Vàng Mẹ Bầu & Bé Yêu', slug: 'combo-de-khang-me-bau-va-be', cat: 17, origin: 'Đa quốc gia', price: 1250000, cmp: 1450000, disc: 14, isGift: 0, emoji: '🤰', desc: 'Tuyển chọn trái cây giàu axit folic, sắt và canxi lành tính cho thai kỳ khỏe mạnh.' },

    // Category 18: Hồng Giòn & Trái Cây Mùa Vụ (9 món)
    { id: 148, name: 'Hồng Giòn Taechu Hàn Quốc Hộp VIP 800g', slug: 'hong-gion-taechu-han-quoc', cat: 18, origin: 'Hàn Quốc', price: 999000, cmp: 1599000, disc: 37, isGift: 0, emoji: '🟠', desc: 'Hồng giòn Taechu Hàn Quốc vỏ mỏng dính, không chát, độ ngọt thanh mát đặc trưng hiếm có.' },
    { id: 149, name: 'Hồng Sấy Dẻo Một Nắng Cheongdo Hàn Quốc', slug: 'hong-say-deo-cheongdo-han-quoc', cat: 18, origin: 'Hàn Quốc', price: 420000, cmp: 480000, disc: 13, isGift: 0, emoji: '🟠', desc: 'Bên ngoài dẻo dai bên trong tươm mật ngọt thơm mùi gió sương vùng Cheongdo.' },
    { id: 150, name: 'Lựu Israel Hạt Mềm Quả Khổng Lồ', slug: 'luu-israel-hat-mem-jumbo', cat: 18, origin: 'Israel', price: 290000, cmp: 340000, disc: 15, isGift: 0, emoji: '🔴', desc: 'Hạt mềm cắn ăn cả hạt không cứng, nước đỏ như rượu vang bồi bổ sắc đẹp.' },
    { id: 151, name: 'Chà Là Tươi Barhi Nam Phi Nguyên Cành', slug: 'cha-la-tuoi-barhi-nam-phi', cat: 18, origin: 'Nam Phi', price: 450000, cmp: 520000, disc: 13, isGift: 0, emoji: '🟡', desc: 'Vị giòn chát ngọt đặc trưng của chà là tươi, món quà quý dành cho người sành ăn.' },
    { id: 152, name: 'Sung Mỹ Tươi Nhập Khẩu Hộp 500g', slug: 'sung-my-tuoi-500g', cat: 18, origin: 'Mỹ', price: 280000, cmp: 330000, disc: 15, isGift: 0, emoji: '🟣', desc: 'Trái sung ngọt mọng mật, hỗ trợ tiêu hóa và giảm chỉ số đường huyết tuyệt vời.' },
    { id: 153, name: 'Việt Quất Hữu Cơ Nam Phi Tươi Hộp 125g', slug: 'viet-quat-nam-phi-125g', cat: 18, origin: 'Nam Phi', price: 175000, cmp: 200000, disc: 13, isGift: 0, emoji: '🫐', desc: 'Đậm đà hương vị tự nhiên vùng thảo nguyên Nam Phi đón mùa hè rực nắng.' },
    { id: 154, name: 'Quả Bơ Hass Mỹ Trái Nhỏ Béo Ngậy', slug: 'bo-hass-my-trai-nho', cat: 18, origin: 'Mỹ', price: 165000, cmp: 195000, disc: 15, isGift: 0, emoji: '🥑', desc: 'Vỏ sần sùi khi chín tím đen, ruột xanh bơ béo đặc sánh không hề sượng.' },
    { id: 155, name: 'Dưa Lưới T-One Nhật Bản Hộp Quà Sang Trọng', slug: 'dua-luoi-t-one-nhat-ban', cat: 18, origin: 'Nhật Bản', price: 580000, cmp: 680000, disc: 15, isGift: 0, emoji: '🍈', desc: 'Vân lưới tinh tế nổi cao như tác phẩm điêu khắc, ngọt 15 độ brix mát lạnh.' },
    { id: 156, name: 'Hồng Giòn New Zealand Quả Vuông Giòn Tan', slug: 'hong-gion-new-zealand', cat: 18, origin: 'New Zealand', price: 290000, cmp: 330000, disc: 12, isGift: 0, emoji: '🟠', desc: 'Quả vuông cứng giòn rụm, ngọt mát không hạt, ăn liền sau bữa cơm tối.' },
  ];

  const slugs = new Set(originalProducts.map(p => p.slug));
  return [...originalProducts.map(p => {
    const verified = catalogProducts.find(item => item.slug === p.slug);
    return verified ? { ...verified, id: p.id } : p;
  }), ...catalogProducts.filter(p => !slugs.has(p.slug))];
}

if (require.main === module) {
  const { schema } = readDatabaseSql();
  const content = generateSeedSql();
  writeDatabaseSql(schema, content);
  console.log(`✅ Seed section generated successfully in: ${DATABASE_SQL_PATH} (${(content.length / 1024).toFixed(1)} KB)`);
}
