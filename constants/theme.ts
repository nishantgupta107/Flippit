import { rem, vw, vh } from '../utils/scaling';

/**
 * Emerald Casino Design System - Color Tokens
 * @see DEV_PLAN.md §7.2
 */
export const colors = {
  // Surface colors (dark green theme)
  surface: '#001209',
  surfaceContainerLow: '#051f10',
  surfaceContainerHigh: '#0a3520',
  surfaceContainerHighest: '#0f4a2c',
  surfaceBright: '#1a6b40',
  surfaceVariant: '#1a3d2a',

  // Primary colors (gold)
  primary: '#ffe792',
  primaryContainer: '#ffd709',
  onPrimary: '#1a1200',
  onPrimaryFixed: '#1a1200',

  // Secondary colors (coral)
  secondary: '#fe7e4f',
  secondaryContainer: '#ff9e7a',
  onSecondary: '#1a1200',

  // Tertiary colors (cyan)
  tertiary: '#68d3ff',
  tertiaryContainer: '#9ee3ff',
  onTertiary: '#001a26',

  // Text colors
  onSurface: '#c8f5dc',
  onSurfaceVariant: '#8fbfa0',
  onSurfaceSecondary: '#6a9a7a',

  // Outline and borders (no 1px borders allowed - use these for backgrounds)
  outlineVariant: 'rgba(200, 245, 220, 0.15)',
  outline: 'rgba(200, 245, 220, 0.3)',

  // Error colors
  error: '#d7383b',
  errorContainer: '#4a0f10',
  onError: '#ffffff',

  // Shadows (floating elements only)
  shadow: 'rgba(0, 0, 0, 0.08)',
} as const;

/**
 * Typography tokens - all values use rem() for responsive scaling
 * @see DEV_PLAN.md §7.1
 */
export const typography = {
  displayLg: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(3.5),
    lineHeight: rem(4),
  },
  displayMd: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(2.5),
    lineHeight: rem(3),
  },
  displaySm: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(2),
    lineHeight: rem(2.5),
  },
  headlineLg: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(2),
    lineHeight: rem(2.5),
  },
  headlineMd: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(1.75),
    lineHeight: rem(2.25),
  },
  headlineSm: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(1.5),
    lineHeight: rem(2),
  },
  titleLg: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(1.125),
    lineHeight: rem(1.5),
  },
  titleMd: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(1),
    lineHeight: rem(1.375),
  },
  titleSm: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(0.875),
    lineHeight: rem(1.25),
  },
  bodyLg: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: rem(1),
    lineHeight: rem(1.5),
  },
  bodyMd: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: rem(0.875),
    lineHeight: rem(1.375),
  },
  bodySm: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: rem(0.75),
    lineHeight: rem(1.125),
  },
  labelLg: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: rem(0.875),
    lineHeight: rem(1.125),
  },
  labelMd: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: rem(0.75),
    lineHeight: rem(1),
  },
  labelSm: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: rem(0.625),
    lineHeight: rem(0.875),
  },
} as const;

/**
 * Spacing tokens - all values use rem()
 */
export const spacing = {
  0: rem(0),
  1: rem(0.125),
  2: rem(0.25),
  3: rem(0.375),
  4: rem(0.5),
  5: rem(0.625),
  6: rem(0.75),
  8: rem(1),
  10: rem(1.25),
  12: rem(1.5),
  16: rem(2),
  20: rem(2.5),
  24: rem(3),
  32: rem(4),
  40: rem(5),
  48: rem(6),
} as const;

/**
 * Border radius tokens - all values use rem()
 * Exception: 9999 is allowed for pill shapes per DEV_PLAN.md §7.1
 */
export const radius = {
  none: 0,
  xs: rem(0.25),
  sm: rem(0.5),
  md: rem(0.75),
  lg: rem(1),
  xl: rem(1.5),
  '2xl': rem(2),
  full: 9999,
} as const;

/**
 * Shadow styles for floating elements only
 * @see DEV_PLAN.md §7.3
 */
export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: rem(1),
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: rem(2),
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: rem(3),
    elevation: 8,
  },
} as const;

/**
 * Layout constants using vw/vh for screen-relative sizing
 */
export const layout = {
  screenPadding: rem(4),
  maxContentWidth: vw(100),
  headerHeight: rem(14),
  bottomTabHeight: rem(16),
  cardWidth: vw(20),
  cardHeight: vh(15),
} as const;
