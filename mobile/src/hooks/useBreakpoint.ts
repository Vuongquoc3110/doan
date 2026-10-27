import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '../theme/tokens';

export interface BreakpointInfo {
  width: number;
  height: number;
  isMobile: boolean; // < 768px
  isTablet: boolean; // 768px - 1023px
  isDesktop: boolean; // >= 1024px
  productColumns: number; // 2 (mobile), 3 (tablet), 4 (desktop)
  maxContainerWidth: number;
}

/**
 * Hook useBreakpoint - Xử lý responsive mượt mà cho cả Web và Mobile.
 * Lắng nghe sự kiện resize của window trong thời gian thực,
 * không gây lỗi hydration mismatch hay đọc sai kích thước khi xoay màn hình.
 */
export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();

  const isMobile = width < BREAKPOINTS.tabletMin;
  const isTablet = width >= BREAKPOINTS.tabletMin && width < BREAKPOINTS.desktopMin;
  const isDesktop = width >= BREAKPOINTS.desktopMin;

  const productColumns = isDesktop ? 4 : isTablet ? 3 : 2;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    productColumns,
    maxContainerWidth: BREAKPOINTS.maxContainerWidth,
  };
}

export default useBreakpoint;
