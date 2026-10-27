import { getAutoDiscoveredServerHost } from '../api/config';

// Fallback ảnh nông sản cao cấp Klever Fruit khi đường dẫn rỗng hoặc ảnh lỗi
export const PLACEHOLDER_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80';

export const PLACEHOLDER_BANNER_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80';

/**
 * Chuẩn hóa URL hình ảnh cho cả Web và Expo Go trên điện thoại thật:
 * 1. Giữ nguyên URL tuyệt đối (http://, https://, data:)
 * 2. Tự động gắn IP LAN của máy chủ khi đường dẫn là relative (/uploads/...)
 * 3. Chống lặp baseURL (ví dụ /api/uploads vs /uploads)
 * 4. Fallback ảnh dự phòng chất lượng cao khi đường dẫn null/rỗng
 */
export function resolveMediaUrl(
  path?: string | null,
  fallbackType: 'product' | 'banner' = 'product'
): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return fallbackType === 'banner' ? PLACEHOLDER_BANNER_IMAGE : PLACEHOLDER_PRODUCT_IMAGE;
  }

  const trimmed = path.trim();

  // Đã là URL tuyệt đối hoặc base64
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Lấy host máy chủ (http://192.168.x.x:4000 hoặc http://localhost:4000)
  const host = getAutoDiscoveredServerHost();

  // Xóa dấu / thừa ở đầu đường dẫn
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${host}${cleanPath}`;
}

export default resolveMediaUrl;
