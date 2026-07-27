import { describe, expect, it } from 'vitest';
import { Color } from 'three';
import {
  LANDMARK_BAND_HEIGHT,
  LANDMARK_BAND_Y,
  LANDMARK_RING_RADIUS,
  createLandmarkBandGeometry,
  createLandmarkRingGeometry,
} from './landmarkGeometry';
import { landmarkVisualFor } from './landmarkState';

/**
 * Phase 10E.1 — screen-space readability, computed rather than claimed.
 *
 * Phase 10D.1's honest verdict was that landmark *state* stops being legible
 * somewhere past 10 m. This measures why, and whether the vertical band fixes
 * it, using a pinhole projection at the project's own camera settings.
 */
const VIEWPORT_HEIGHT_PX = 900;
const VERTICAL_FOV_DEG = 50;
/** Standing eye height, and the band is placed to meet it. */
const EYE_HEIGHT = 1.7;

/** Pixels subtended by `metres` of *vertical* extent at `distance`, head-on. */
function verticalPixels(metres: number, distance: number): number {
  const frustumHeight = 2 * distance * Math.tan((VERTICAL_FOV_DEG * Math.PI) / 360);
  return (metres / frustumHeight) * VIEWPORT_HEIGHT_PX;
}

/**
 * Approximate screen-space area of each cue at a given distance.
 *
 * The ring lies flat, so what reaches the eye is its *foreshortened* depth:
 * a standing player at distance `d` sees the ground plane at an angle whose
 * sine is `EYE_HEIGHT / hypot(d, EYE_HEIGHT)`. The band is vertical and faces
 * the player, so it foreshortens only by the same 1/d falloff everything has.
 */
function cueAreaPx(distance: number) {
  const ringOuterDiameter = (LANDMARK_RING_RADIUS + 0.055) * 2;
  const ringBandWidth = 0.11;
  const grazing = EYE_HEIGHT / Math.hypot(distance, EYE_HEIGHT);
  const ring =
    verticalPixels(ringOuterDiameter, distance) * verticalPixels(ringBandWidth, distance) * grazing;

  // Only the front half of the collar is visible; its silhouette width is the
  // shaft diameter at that height.
  const bandVisibleWidth = 0.125 * 2;
  const band = verticalPixels(bandVisibleWidth, distance) * verticalPixels(LANDMARK_BAND_HEIGHT, distance);
  return { ring, band };
}

describe('landmark state readability', () => {
  it('places the band at standing eye height, where the eye already is', () => {
    expect(LANDMARK_BAND_Y).toBeGreaterThan(EYE_HEIGHT * 0.55);
    expect(LANDMARK_BAND_Y).toBeLessThan(EYE_HEIGHT);
  });

  /**
   * The measurement that motivated the band, and the division of labour it
   * produced. Measured areas (px^2, band ÷ ring):
   *
   *   40 m — 2.5 vs 10.2   (4.12x)
   *   20 m — 19.7 vs 40.7  (2.06x)
   *   10 m — 156 vs 163    (1.04x)
   *    2 m — 15094 vs 4074 (0.27x)
   *
   * The band takes over exactly where the ring fails, and the ring keeps the
   * close range where a player looks down at the plinth. Neither replaces the
   * other, which is why both are kept.
   */
  it('out-reads the ring at 20 m and beyond, where the ring fails', () => {
    for (const distance of [20, 40]) {
      const { ring, band } = cueAreaPx(distance);
      expect(band, `band should out-read the ring at ${distance} m`).toBeGreaterThan(ring * 2);
    }
  });

  it('leaves the close range to the ring, which is larger there', () => {
    const { ring, band } = cueAreaPx(2);
    expect(ring).toBeGreaterThan(band * 2);
  });

  /** Below roughly a pixel there is nothing to see, whatever the colour. */
  it('keeps the band above a one-pixel floor out to 20 m', () => {
    expect(verticalPixels(LANDMARK_BAND_HEIGHT, 20)).toBeGreaterThan(1);
  });

  it('honestly reports that 40 m is past the limit for state', () => {
    // Sub-pixel: at 40 m the lamp still reads as a landmark by silhouette, but
    // its state does not. Phase 10E.1 does not claim otherwise.
    expect(verticalPixels(LANDMARK_BAND_HEIGHT, 40)).toBeLessThan(2);
  });

  /**
   * Screen area is only half of legibility — the two states must also differ in
   * tone, not merely hue, or they collapse together on a poor display.
   */
  describe('unexplored vs completed contrast', () => {
    const luminance = (color: Color) => color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;

    it('separates the two states the brief cares about most', () => {
      const unexplored = landmarkVisualFor('idle').ringColor;
      const completed = landmarkVisualFor('complete').ringColor;
      // WCAG-style ratio on linear luminance; > 3 is a clear, non-subtle step.
      const ratio = (Math.max(luminance(unexplored), luminance(completed)) + 0.05)
        / (Math.min(luminance(unexplored), luminance(completed)) + 0.05);
      expect(ratio).toBeGreaterThan(3);
    });

    it('keeps completed brighter than unexplored, not merely different', () => {
      expect(luminance(landmarkVisualFor('complete').ringColor))
        .toBeGreaterThan(luminance(landmarkVisualFor('idle').ringColor));
    });
  });

  describe('geometry contract', () => {
    it('carries the colour attribute per-instance tinting needs', () => {
      for (const geometry of [createLandmarkBandGeometry(), createLandmarkRingGeometry()]) {
        expect(geometry.getAttribute('color')).toBeDefined();
      }
    });

    it('adds a band narrow enough to read as inlay, not a collar', () => {
      expect(LANDMARK_BAND_HEIGHT).toBeLessThan(0.1);
    });

    it('stays cheap with the anchoring oil cup included', () => {
      const band = createLandmarkBandGeometry();
      expect(band.getAttribute('position').count).toBeLessThan(160);
    });
  });
});
