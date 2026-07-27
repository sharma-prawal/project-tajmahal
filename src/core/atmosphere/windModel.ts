/** Shared policy for every non-gameplay environmental motion system. */
export const ENVIRONMENTAL_MOTION = {
  normalScale: 1,
  reducedMotionScale: 0,
} as const;

export function environmentalMotionScale(reducedMotion: boolean): number {
  return reducedMotion ? ENVIRONMENTAL_MOTION.reducedMotionScale : ENVIRONMENTAL_MOTION.normalScale;
}

/** Absolute-clock sampling keeps motion deterministic and frame-rate independent. */
export function environmentalWindTime(elapsedSeconds: number, windSpeed: number): number {
  return Math.max(0, elapsedSeconds) * Math.max(0, windSpeed);
}

