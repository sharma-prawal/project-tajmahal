export const ATMOSPHERE = {
  // Phase 9C: a little more aerial perspective for depth/scale (foreground crisp,
  // background gently softened) — enough to separate the tree/architecture layers
  // and place the Taj as a luminous far mass, without ever hiding it. Still well
  // below the old 0.0048–0.0062 band that washed the facade.
  fogDensityStart: 0.0044,
  fogDensityEnd: 0.0058,
  sky: {
    // Phase 9C: a believable early-morning gradient — a deeper blue zenith
    // (higher rayleigh) falling to a soft warm sun halo near the low sun
    // (higher mie). No dramatic clouds or fantasy colour.
    turbidityStart: 2.3,
    turbidityEnd: 4.0,
    rayleighStart: 1.75,
    rayleighEnd: 0.72,
    mieCoefficientStart: 0.0065,
    mieCoefficientEnd: 0.006,
    mieDirectionalGStart: 0.83,
    mieDirectionalGEnd: 0.84,
  },
  wind: {
    amplitude: 0.045,
    speed: 0.48,
  },
  particles: {
    color: '#efd9a8',
    opacity: 0.18,
    highCount: 140,
    mediumCount: 70,
  },
} as const;

/**
 * Phase 10B — the living sky (Objective 8). Fair-weather cloud only: a high
 * threshold leaves most of the sky open, and the drift speeds are a few metres
 * per second so the sky is never something the player watches *move*.
 */
export const CLOUDS = {
  textureSize: 512,
  /** Noise density (0–1, after range normalisation) above which cloud exists; higher = more open sky. */
  threshold: 0.4,
  /** Width of the soft edge above the threshold. */
  softness: 0.26,
  /** How far the cloud colour follows the narrative sunset ramp (0 = always white). */
  sunsetTint: 0.25,
  /** Brightness of a thin cloud edge relative to a dense core (1 = flat white). */
  edgeShade: 0.68,
  /**
   * Every disc must fit inside the camera's 500 m far plane — the camera is
   * out of scope for this phase, so a cloud layer that reaches past it would
   * simply be sliced off in a hard circle overhead. Furthest corner here is
   * √(440² + 215²) ≈ 490 m.
   */
  layers: [
    // Low deck — wide and shallow so cloud reaches down to ~8° elevation,
    // which is where a level walk actually looks.
    { altitude: 70, radius: 470, repeat: 1.6, opacity: 1, speed: 0.0016, fadeStart: 0.3 },
    // Mid deck.
    { altitude: 140, radius: 440, repeat: 2.4, opacity: 0.72, speed: 0.0024, fadeStart: 0.42 },
    // High wisps — parallax when the player looks up.
    { altitude: 215, radius: 440, repeat: 3.2, opacity: 0.5, speed: 0.0034, fadeStart: 0.5 },
  ],
} as const;

export const ATMOSPHERE_QUALITY = {
  high: { windScale: 1, updateFps: 60, particleCount: ATMOSPHERE.particles.highCount, cloudLayers: 3 },
  medium: { windScale: 0.72, updateFps: 30, particleCount: ATMOSPHERE.particles.mediumCount, cloudLayers: 2 },
  low: { windScale: 0.35, updateFps: 15, particleCount: 0, cloudLayers: 1 },
} as const;
