/**
 * KLEVER FRUIT DESIGN SYSTEM TOKENS
 * Single source of truth for both Web and Native platforms.
 * Adheres to Luxury Imported Fruit & Premium Gift Basket Art Direction.
 */

import { Platform } from 'react-native';

export const COLORS = {
  // Brand & Accent Colors
  primary: '#183e32', // Brand luxury deep emerald
  primaryHover: '#285342', // Hover state on web
  primaryActive: '#102e24', // Pressed / active state
  primaryLight: '#e9ecdf', // Subtle brand background tint

  accent: '#C82333', // Promotional price, discount badge & main CTA
  accentHover: '#B01E2C', // CTA hover state
  accentLight: '#FDF1F2', // Soft red tag background

  // Origin Badge (Xuất xứ nhập khẩu)
  originBg: '#FDF3D7', // Parchment cream background
  originText: '#8A5A00', // Amber-gold readable label

  // Surfaces & Backgrounds
  background: '#f7f5ef', // Primary warm luxury linen canvas
  surface: '#FFFFFF', // Card and sheet surface
  surfaceMuted: '#efeee5', // Light contrast block background
  surfaceElevated: '#FFFFFF', // Modals and dropdowns

  // Text Hierarchy
  textPrimary: '#183e32', // Deep forest high-contrast text (WCAG AA compliant)
  textSecondary: '#687367', // Secondary metadata, specs, subheadings
  textMuted: '#7D8E82', // Hints, placeholders, disabled text
  textInverse: '#FFFFFF', // Text on primary/accent buttons

  // Borders & Dividers
  border: '#E6E1D6', // Subtle 1px dividers and card outlines
  borderStrong: '#D2CAB9', // Input borders and focused outlines
  borderActive: '#183e32', // Focused input border

  // Status & Utility
  success: '#1E7E34',
  successLight: '#EAF6EC',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#EFF6FF',

  // Interactive States
  hoverMask: 'rgba(0, 0, 0, 0.04)',
  pressedMask: 'rgba(0, 0, 0, 0.08)',
  focusRing: 'rgba(30, 70, 32, 0.25)',
  backdrop: 'rgba(19, 42, 28, 0.45)',

  // Legacy mappings to guarantee existing screens continue running without breakage
  purple: '#183e32',
  purpleDark: '#183e32',
  purpleLight: '#e9ecdf',
  purpleBadge: '#183e32',
  gold: '#8A5A00',
  goldDark: '#704700',
  redSale: '#C82333',
  greenCheck: '#1E7E34',
  bg: '#f7f5ef',
  card: '#FFFFFF',
  text: '#183e32',
  muted: '#687367',
  inputBg: '#efeee5',
  white: '#FFFFFF',
  black: '#000000',
  shadow: 'rgba(19, 42, 28, 0.08)',
} as const;

export const TYPOGRAPHY = {
  // Font Families (Lora for Headings, Be Vietnam Pro for Body)
  fonts: {
    heading: Platform.select({
      web: "'Lora', 'Playfair Display', Georgia, serif",
      default: 'serif',
    }),
    headingBold: Platform.select({
      web: "'Lora', 'Playfair Display', Georgia, serif",
      default: 'serif',
    }),
    body: Platform.select({
      web: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
      default: 'System',
    }),
    bodyMedium: Platform.select({
      web: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
      default: 'System',
    }),
    bodyBold: Platform.select({
      web: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
      default: 'System',
    }),
  },

  // Font Sizes
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 34,
    '5xl': 40,
  },

  // Line Heights
  lineHeights: {
    xs: 16,
    sm: 18,
    base: 22,
    md: 24,
    lg: 26,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 42,
    '5xl': 48,
  },

  // Font Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const RADII = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  base: 8,
  lg: 12,
  xl: 16,
  full: 9999, // Reserved for chips and round action buttons
} as const;

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#183e32',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#183e32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#183e32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  sheet: {
    shadowColor: '#183e32',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  drawer: {
    shadowColor: '#183e32',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const BREAKPOINTS = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1023,
  desktopMin: 1024,
  maxContainerWidth: 1280,
} as const;

export const TOUCH_TARGET = {
  minWidth: 44,
  minHeight: 44,
} as const;

export const Z_INDEX = {
  base: 1,
  dropdown: 1000,
  sticky: 1100,
  drawer: 1200,
  modal: 1300,
  toast: 1400,
} as const;

export default {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radii: RADII,
  shadows: SHADOWS,
  breakpoints: BREAKPOINTS,
  touchTarget: TOUCH_TARGET,
  zIndex: Z_INDEX,
};
