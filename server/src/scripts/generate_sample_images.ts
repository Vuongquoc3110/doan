import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(__dirname, '../../uploads');
const productsDir = path.join(uploadsDir, 'products');
const bannersDir = path.join(uploadsDir, 'banners');

// Ensure directories exist
for (const dir of [uploadsDir, productsDir, bannersDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Sinh vector SVG minh họa sản phẩm chất lượng cao chuẩn Klever Fruit
 * Tỷ lệ 1:1 (600x600), màu thương hiệu sang trọng, minh bạch là ảnh minh họa nội bộ
 */
export function generateProductSvg(name: string, category: string, origin: string, emoji: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FAF7F2" />
      <stop offset="100%" stop-color="#F4EFE6" />
    </linearGradient>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#F4EFE6" stop-opacity="0" />
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#132A1C" flood-opacity="0.08" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="600" height="600" fill="url(#bgGrad)" />
  <circle cx="300" cy="270" r="200" fill="url(#glowGrad)" />

  <!-- Frame Border -->
  <rect x="20" y="20" width="560" height="560" rx="16" fill="none" stroke="#E6E1D6" stroke-width="2" />

  <!-- Brand Watermark Top Left -->
  <g transform="translate(40, 50)">
    <rect width="110" height="28" rx="6" fill="#1E4620" />
    <text x="55" y="18" font-family="'Be Vietnam Pro', sans-serif" font-size="11" font-weight="700" fill="#FFFFFF" text-anchor="middle">KLEVER FRUIT</text>
  </g>

  <!-- Origin Tag Top Right -->
  <g transform="translate(420, 50)">
    <rect width="140" height="28" rx="6" fill="#FDF3D7" stroke="#E8D7A5" stroke-width="1" />
    <text x="70" y="18" font-family="'Be Vietnam Pro', sans-serif" font-size="11" font-weight="600" fill="#8A5A00" text-anchor="middle">XUẤT XỨ: ${origin.toUpperCase()}</text>
  </g>

  <!-- Center Product Illustration Circle -->
  <circle cx="300" cy="270" r="140" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2" filter="url(#shadow)" />
  <circle cx="300" cy="270" r="110" fill="#FFFFFF" />
  <text x="300" y="315" font-size="110" text-anchor="middle">${emoji}</text>

  <!-- Product Name & Category -->
  <text x="300" y="460" font-family="'Lora', 'Playfair Display', serif" font-size="24" font-weight="700" fill="#132A1C" text-anchor="middle">${escapeXml(name)}</text>
  <text x="300" y="495" font-family="'Be Vietnam Pro', sans-serif" font-size="14" font-weight="500" fill="#55685B" text-anchor="middle">${escapeXml(category)} • Nhập khẩu chính ngạch</text>

  <!-- Disclaimer Footer -->
  <rect x="150" y="525" width="300" height="26" rx="13" fill="#EBF2EC" />
  <text x="300" y="542" font-family="'Be Vietnam Pro', sans-serif" font-size="11" font-weight="600" fill="#1E4620" text-anchor="middle">✓ Cam kết bồi hoàn trong 48 giờ</text>
</svg>`;
}

/**
 * Sinh vector SVG banner Web (16:6 - 1600x600)
 */
export function generateBannerWebSvg(title: string, subtitle: string, cta: string, badge: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600" viewBox="0 0 1600 600">
  <defs>
    <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E4620" />
      <stop offset="60%" stop-color="#132A1C" />
      <stop offset="100%" stop-color="#0B1A11" />
    </linearGradient>
    <radialGradient id="accentGlow" cx="80%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#132A1C" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="1600" height="600" fill="url(#bannerBg)" />
  <rect width="1600" height="600" fill="url(#accentGlow)" />

  <!-- Golden luxury borders -->
  <rect x="30" y="30" width="1540" height="540" rx="12" fill="none" stroke="#F5A623" stroke-width="1.5" stroke-opacity="0.3" />

  <!-- Badge -->
  <g transform="translate(100, 110)">
    <rect width="220" height="36" rx="6" fill="#FDF3D7" />
    <text x="110" y="23" font-family="'Be Vietnam Pro', sans-serif" font-size="13" font-weight="700" fill="#8A5A00" text-anchor="middle">★ ${escapeXml(badge)}</text>
  </g>

  <!-- Title -->
  <text x="100" y="230" font-family="'Lora', 'Playfair Display', serif" font-size="52" font-weight="700" fill="#FFFFFF">${escapeXml(title)}</text>
  <text x="100" y="290" font-family="'Be Vietnam Pro', sans-serif" font-size="22" font-weight="400" fill="#E6E1D6">${escapeXml(subtitle)}</text>

  <!-- CTA Button -->
  <g transform="translate(100, 360)">
    <rect width="220" height="56" rx="8" fill="#C82333" />
    <text x="110" y="35" font-family="'Be Vietnam Pro', sans-serif" font-size="18" font-weight="700" fill="#FFFFFF" text-anchor="middle">${escapeXml(cta)} →</text>
  </g>

  <!-- Graphic elements right side -->
  <g transform="translate(1250, 300)">
    <circle cx="0" cy="0" r="160" fill="${color}" fill-opacity="0.2" stroke="#F5A623" stroke-width="2" />
    <circle cx="0" cy="0" r="120" fill="#FFFFFF" fill-opacity="0.08" />
    <text x="0" y="35" font-size="120" text-anchor="middle">🍇</text>
  </g>
</svg>`;
}

/**
 * Sinh vector SVG banner Mobile (4:5 hoặc 16:9 - 800x1000)
 */
export function generateBannerMobileSvg(title: string, subtitle: string, cta: string, badge: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="mobBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E4620" />
      <stop offset="50%" stop-color="#132A1C" />
      <stop offset="100%" stop-color="#08140D" />
    </linearGradient>
  </defs>

  <rect width="800" height="1000" fill="url(#mobBg)" />
  <rect x="20" y="20" width="760" height="960" rx="16" fill="none" stroke="#F5A623" stroke-width="1.5" stroke-opacity="0.3" />

  <!-- Badge -->
  <g transform="translate(50, 70)">
    <rect width="200" height="34" rx="6" fill="#FDF3D7" />
    <text x="100" y="22" font-family="'Be Vietnam Pro', sans-serif" font-size="12" font-weight="700" fill="#8A5A00" text-anchor="middle">★ ${escapeXml(badge)}</text>
  </g>

  <!-- Graphic center -->
  <g transform="translate(400, 340)">
    <circle cx="0" cy="0" r="160" fill="${color}" fill-opacity="0.25" stroke="#F5A623" stroke-width="2" />
    <text x="0" y="50" font-size="160" text-anchor="middle">🍒</text>
  </g>

  <!-- Title & Subtitle -->
  <text x="400" y="580" font-family="'Lora', 'Playfair Display', serif" font-size="38" font-weight="700" fill="#FFFFFF" text-anchor="middle">${escapeXml(title)}</text>
  <text x="400" y="630" font-family="'Be Vietnam Pro', sans-serif" font-size="18" font-weight="400" fill="#E6E1D6" text-anchor="middle">${escapeXml(subtitle)}</text>

  <!-- CTA -->
  <g transform="translate(260, 720)">
    <rect width="280" height="56" rx="8" fill="#C82333" />
    <text x="140" y="35" font-family="'Be Vietnam Pro', sans-serif" font-size="17" font-weight="700" fill="#FFFFFF" text-anchor="middle">${escapeXml(cta)}</text>
  </g>

  <text x="400" y="850" font-family="'Be Vietnam Pro', sans-serif" font-size="13" font-weight="500" fill="#8A5A00" text-anchor="middle">GIAO HÀNG HỎA TỐC 2H TRONG NỘI THÀNH</text>
</svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildAndSaveAllSampleImages(): void {
  console.log('🎨 Khởi tạo bộ tài sản hình ảnh vector nội bộ Klever Fruit...');

  // 1. Generate Product Sample Images
  const sampleProductTypes = [
    { slug: 'cherry-do-my', name: 'Cherry Đỏ Mỹ Size 8.5', cat: 'Cherry Nhập Khẩu', origin: 'Mỹ', emoji: '🍒', color: '#C82333' },
    { slug: 'nho-mau-don-nhat', name: 'Nho Mẫu Đơn Shine Muscat', cat: 'Nho Nhập Khẩu', origin: 'Nhật Bản', emoji: '🍇', color: '#2E7D32' },
    { slug: 'tao-envy-new-zealand', name: 'Táo Envy Size 28', cat: 'Táo Thượng Hạng', origin: 'New Zealand', emoji: '🍎', color: '#D32F2F' },
    { slug: 'le-han-quoc-vip', name: 'Lê Nâu Hàn Quốc Hộp Quà', cat: 'Lê Cao Cấp', origin: 'Hàn Quốc', emoji: '🍐', color: '#F57C00' },
    { slug: 'dau-tay-seolhyang', name: 'Dâu Tây Seolhyang Thượng Hạng', cat: 'Dâu Tây & Quả Mọng', origin: 'Hàn Quốc', emoji: '🍓', color: '#E91E63' },
    { slug: 'viet-quat-my', name: 'Việt Quất Hộp Jumbo Mỹ', cat: 'Dâu Tây & Quả Mọng', origin: 'Mỹ', emoji: '🫐', color: '#3F51B5' },
    { slug: 'kiwi-vang-zespri', name: 'Kiwi Vàng Zespri SunGold', cat: 'Kiwi & Quả Nhiệt Đới', origin: 'New Zealand', emoji: '🥝', color: '#FBC02D' },
    { slug: 'cam-cara-ruot-do', name: 'Cam Cara Ruột Đỏ Úc', cat: 'Cam & Quýt', origin: 'Úc', emoji: '🍊', color: '#FF9800' },
    { slug: 'gio-qua-thanh-hoa', name: 'Giỏ Quà 20/10 Thanh Hoa', cat: 'Giỏ Quà Tặng 20/10', origin: 'Klever Atelier', emoji: '🎁', color: '#8E24AA' },
    { slug: 'gio-qua-phu-quy', name: 'Giỏ Quà Tết Phú Quý VIP', cat: 'Hộp Quà Cao Cấp', origin: 'Klever Atelier', emoji: '🧺', color: '#1E4620' },
    { slug: 'nuoc-ep-cherry-cold-pressed', name: 'Nước Ép Cherry Tươi Cold-Pressed', cat: 'Nước Ép & Đồ Uống', origin: 'Việt Nam', emoji: '🥤', color: '#AD1457' },
    { slug: 'the-qua-tang-500k', name: 'Thẻ Quà Tặng Klever Gift Card 500k', cat: 'Gift Card', origin: 'Klever Fruit', emoji: '💳', color: '#F5A623' },
  ];

  for (const p of sampleProductTypes) {
    const svgContent = generateProductSvg(p.name, p.cat, p.origin, p.emoji, p.color);
    const filePath = path.join(productsDir, `${p.slug}.svg`);
    fs.writeFileSync(filePath, svgContent, 'utf8');
  }

  // 2. Generate Banner Sample Images (Web & Mobile)
  const sampleBanners = [
    { id: 1, title: 'MÙA VỤ CHERRY MỸ 2026', subtitle: 'Tươi giòn cuống xanh, hạ cánh trực tiếp trong 24h', cta: 'Đặt Mua Ngay', badge: 'MÙA VỤ VÀNG', color: '#C82333' },
    { id: 2, title: 'BỘ SƯU TẬP QUÀ TẶNG 20/10', subtitle: 'Thay ngàn lời chúc tri ân gửi người phụ nữ yêu thương', cta: 'Khám Phá Bộ Sưu Tập', badge: 'BST ĐẶC QUYỀN', color: '#8E24AA' },
    { id: 3, title: 'NHO MẪU ĐƠN SHINE MUSCAT', subtitle: 'Hương thơm xạ hương quý phái chuẩn chứng nhận xuất xứ', cta: 'Thưởng Thức Ngay', badge: 'NHẬP KHẨU BAY AIR', color: '#2E7D32' },
    { id: 4, title: 'COMBO VITAMIN GIA ĐÌNH', subtitle: 'Chăm sóc sức khỏe toàn diện 7 ngày với 5 loại quả cao cấp', cta: 'Chọn Gói Tuần', badge: 'SỨC KHỎE VÀNG', color: '#F5A623' },
  ];

  for (const b of sampleBanners) {
    const webSvg = generateBannerWebSvg(b.title, b.subtitle, b.cta, b.badge, b.color);
    const mobSvg = generateBannerMobileSvg(b.title, b.subtitle, b.cta, b.badge, b.color);

    fs.writeFileSync(path.join(bannersDir, `banner_${b.id}_web.svg`), webSvg, 'utf8');
    fs.writeFileSync(path.join(bannersDir, `banner_${b.id}_mobile.svg`), mobSvg, 'utf8');
  }

  console.log(`✔ Đã tạo thành công ${sampleProductTypes.length} ảnh sản phẩm và ${sampleBanners.length * 2} ảnh banner nội bộ tại /server/uploads/`);
}

// Chạy trực tiếp khi file được execute
if (require.main === module) {
  buildAndSaveAllSampleImages();
}
