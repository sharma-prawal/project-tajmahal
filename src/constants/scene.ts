export const FOG = {
  color: '#cdd8e3',
  near: 15,
  far: 90,
  /** FogExp2 density (Phase 4B) — a softer, more natural distance falloff than linear near/far for an open garden scene; near/far above are kept for reference/back-compat, not read by `SkyAndFog` anymore. */
  density: 0.0055,
} as const;

export const SKY = {
  turbidity: 3,
  rayleigh: 1,
  mieCoefficient: 0.003,
  mieDirectionalG: 0.8,
  elevation: 25,
  azimuth: 180,
} as const;

export const LIGHTING = {
  ambientIntensity: 0.55,
  // Phase 9C: a touch stronger, warmer key and a slightly lower sun (~38° vs the
  // old ~53°) for gentle raking morning light and longer, calmer shadows across
  // the garden — the emotional core of a "peaceful morning" without going to a
  // horizon-grazing sunset angle.
  sunIntensity: 2.35,
  sunPosition: [46, 42, -28] as [number, number, number],
} as const;

/** Phase 4B: renderer-level tone mapping/exposure — a cheap, built-in filmic response (no post-processing pass) plus a restrained sunT-driven exposure swing distinct from the light-intensity swing already in `Lighting`. */
export const EXPOSURE = {
  // Phase 9C.1: AgX tone mapping is darker/more filmic than ACES and needs more
  // light in — this is calibrated for AgX (≈1.35) to keep the morning bright and
  // airy while AgX gives the gentle highlight rolloff + stable whites/hues.
  base: 1.35,
  duskMultiplierRange: 0.12,
} as const;

/** Directional-light shadow tuning (Phase 4B) — reduces acne (bias/normalBias) and peter-panning while keeping edges soft (radius, requires PCFSoftShadowMap on the renderer). */
export const SHADOW_TUNING = {
  bias: -0.0006,
  normalBias: 0.035,
  // Phase 9C: softer penumbra for calm morning shadows (PCFSoft radius).
  radius: 4.5,
} as const;

/** Hemisphere fill light (Phase 4B) — replaces a flat ambient with a warm-ground/cool-sky split for believable indirect light, matching the sunset colour ramp at the extremes. */
export const HEMISPHERE_LIGHT = {
  // Phase 9C: a soft cool morning-sky fill over a warmer ground bounce — lifts
  // shadow-side detail (no black shadows) while letting the warm golden key be
  // the story. Intensity eased down so the warm directional light clearly
  // dominates the fill and the marble reads golden, not flat cool-white.
  skyColor: '#cfe0ee',
  groundColor: '#7c6a4a',
  intensity: 0.62,
} as const;

/** Procedural (no network) environment map for subtle marble specular response (Phase 4B).
 *  Phase 9C: raised so marble/stone and water gain a gentle morning sheen and
 *  shadow-side surfaces keep readable indirect light (still cheap — one PMREM). */
export const ENVIRONMENT_MAP = {
  intensity: 0.5,
} as const;

/** Cheap baked contact-shadow catcher under the mausoleum platform (Phase 4B) — grounds the Taj without a full SSAO pass. */
export const CONTACT_SHADOWS = {
  opacity: 0.55,
  blur: 2.4,
  farPlane: 8,
  resolution: 512,
} as const;

export const CAMERA_DEFAULTS = {
  fov: 52,
  near: 0.1,
  far: 500,
} as const;

export const EXPLORATION_CAMERA = {
  distance: 5.6,
  height: 2.55,
  lookHeight: 1.35,
  shoulderOffset: 0.58,
  positionSmoothing: 5,
  lookSmoothing: 6,
  minHeightAboveGround: 0.3,
  collisionMargin: 0.28,
  minimumCollisionDistance: 1.25,
  collisionReleaseSmoothing: 10,
} as const;
