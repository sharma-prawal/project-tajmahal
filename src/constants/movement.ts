export const MOVEMENT = {
  walkSpeed: 2.25,
  runMultiplier: 1.72,
  acceleration: 8,
  deceleration: 10,
  airControl: 0.3,
  rotationSmoothing: 14,
} as const;

export const MOUSE_LOOK = {
  sensitivity: 0.0022,
  pitchMin: -0.55,
  pitchMax: 0.95,
} as const;

export const TOUCH_LOOK = {
  // Radians of look rotation per pixel of drag, same convention as
  // MOUSE_LOOK.sensitivity — multiply directly, never divide.
  sensitivity: 0.0045,
} as const;

export const JOYSTICK = {
  maxRadius: 50,
  deadzone: 0.12,
} as const;
