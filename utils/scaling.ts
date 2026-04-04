import { Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Base design reference: 390px wide (iPhone 14 Pro viewport)
const BASE_WIDTH = 390;

/**
 * rem — scales with screen width, relative to 16px base font
 * Use for: font sizes, padding, gaps, border radius, icon sizes
 */
export const rem = (value: number): number =>
  (value * 16 * SCREEN_W) / BASE_WIDTH;

/**
 * vw — percentage of screen width
 * Use for: component widths, horizontal margins, card widths
 */
export const vw = (percent: number): number =>
  (SCREEN_W * percent) / 100;

/**
 * vh — percentage of screen height
 * Use for: component heights, vertical section spacing, card heights
 */
export const vh = (percent: number): number =>
  (SCREEN_H * percent) / 100;

/**
 * Get current screen dimensions (for dynamic calculations)
 */
export const getScreenDimensions = () => ({
  width: SCREEN_W,
  height: SCREEN_H,
});

/**
 * Minimum touch target size (44px equivalent in rem units)
 * Use for ensuring accessible touch targets
 */
export const MIN_TOUCH_TARGET = rem(2.75);
