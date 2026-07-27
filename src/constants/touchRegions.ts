/**
 * Touch-region ownership (Part 9/03-player-guidance.md): the left half of
 * the screen owns movement (virtual joystick), the right half owns look —
 * defined once here so every touch-consuming piece (input capture in
 * `useTouchControls`, the visual overlay, future memory-interaction taps)
 * agrees on the same split instead of re-deriving it.
 */
export const TOUCH_REGIONS = {
  /** Fraction of viewport width that belongs to the movement (joystick) zone; the remainder is the look zone. */
  movementZoneFraction: 0.5,
} as const;

/** CSS safe-area inset variables (index.html sets `viewport-fit=cover` so these resolve on notched/gesture-bar devices). */
export const SAFE_AREA_INSET = {
  top: 'env(safe-area-inset-top, 0px)',
  right: 'env(safe-area-inset-right, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left: 'env(safe-area-inset-left, 0px)',
} as const;
