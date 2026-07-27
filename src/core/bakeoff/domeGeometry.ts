import { TAJ_PROPORTIONS } from './tajProportions';

export interface ProfilePoint {
  x: number;
  y: number;
}

/**
 * Converts the central proportion spec's (radiusFraction, heightFraction)
 * onion-dome profile into absolute lathe points — pure and testable without
 * Three.js. `LatheGeometry` (built by `DomeModule`) revolves these points
 * around the Y axis to produce the dome silhouette.
 */
export function buildDomeProfilePoints(
  segmentCount: number = TAJ_PROPORTIONS.dome.profile.length,
  profileOverride?: readonly { r: number; h: number }[],
): ProfilePoint[] {
  const { profile, drumRadius, apexHeight } = TAJ_PROPORTIONS.dome;
  const base = profileOverride ?? profile;
  const source = segmentCount === base.length ? base : resample(base, segmentCount);
  return source.map((p) => ({ x: p.r * drumRadius, y: p.h * apexHeight }));
}

function resample(
  profile: readonly { r: number; h: number }[],
  count: number,
): { r: number; h: number }[] {
  if (count <= 1) return [profile[0]];
  const result: { r: number; h: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const scaledIndex = t * (profile.length - 1);
    const lower = Math.floor(scaledIndex);
    const upper = Math.min(profile.length - 1, lower + 1);
    const localT = scaledIndex - lower;
    result.push({
      r: profile[lower].r + (profile[upper].r - profile[lower].r) * localT,
      h: profile[lower].h + (profile[upper].h - profile[lower].h) * localT,
    });
  }
  return result;
}
