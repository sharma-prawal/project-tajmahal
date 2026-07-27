export interface DeviceCapabilities {
  /** Device exposes a touch surface at all (can be true alongside a mouse — hybrid laptops). */
  hasTouch: boolean;
  /** Primary pointer is precise (mouse/trackpad), per the `pointer` media feature. */
  hasFinePointer: boolean;
  /** Primary input can hover without activating (mouse), per the `hover` media feature. */
  hasHover: boolean;
}

/**
 * Static capability probe — safe to compute once. This is deliberately NOT
 * "which input is the user using right now": a hybrid touchscreen laptop can
 * have hasTouch=true and hasFinePointer=true simultaneously. Which input is
 * actually active is tracked separately (see useActiveInputTracking) since
 * it can change mid-session when a mouse is plugged in or a touch begins.
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined') {
    return { hasTouch: false, hasFinePointer: true, hasHover: true };
  }
  return {
    hasTouch: navigator.maxTouchPoints > 0 || window.matchMedia('(any-pointer: coarse)').matches,
    hasFinePointer: window.matchMedia('(pointer: fine)').matches,
    hasHover: window.matchMedia('(hover: hover)').matches,
  };
}
