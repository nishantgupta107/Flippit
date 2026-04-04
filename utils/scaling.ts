import { Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Base design reference: 390px wide (iPhone 14 Pro viewport)
const BASE_WIDTH = 390;

// Maximum width for scaling (prevents UI from becoming too large on desktop)
const MAX_SCALE_WIDTH = 500;
const EFFECTIVE_WIDTH = Math.min(SCREEN_W, MAX_SCALE_WIDTH);

const MAX_SCALE_HEIGHT = 900;
const EFFECTIVE_HEIGHT = Math.min(SCREEN_H, MAX_SCALE_HEIGHT);

/**
 * rem — scales with screen width, relative to 16px base font
 * Use for: font sizes, padding, gaps, border radius, icon sizes
 */
export const rem = (value: number): number =>
  (value * 16 * EFFECTIVE_WIDTH) / BASE_WIDTH;

/**
 * vw — percentage of screen width (capped for desktop)
 * Use for: component widths, horizontal margins, card widths
 */
export const vw = (percent: number): number =>
  (EFFECTIVE_WIDTH * percent) / 100;

/**
 * vh — percentage of screen height (capped for desktop)
 * Use for: component heights, vertical section spacing, card heights
 */
export const vh = (percent: number): number =>
  (EFFECTIVE_HEIGHT * percent) / 100;

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
