import { describe, expect, it } from 'vitest';
import { MEMORY_PHASES } from './types';
import { flameFlicker, landmarkStateFor, landmarkVisualFor } from './landmarkState';

describe('memory landmark four-state visual language', () => {
  it('maps all five engine phases onto the four player-facing states', () => {
    expect(landmarkStateFor('idle')).toBe('undiscovered');
    expect(landmarkStateFor('cued')).toBe('nearby');
    expect(landmarkStateFor('engaged')).toBe('active');
    expect(landmarkStateFor('revealing')).toBe('active');
    expect(landmarkStateFor('complete')).toBe('completed');
  });

  /**
   * The art-director test, as an assertion: a player must be able to tell the
   * four states apart *without any text*. That means no two states may share a
   * flame colour, a ring colour, or a flame size — if any pair collided, two
   * different situations would look identical in the world.
   */
  it('gives each state a distinguishable flame colour, inlay colour and size', () => {
    const visuals = MEMORY_PHASES.map((phase) => landmarkVisualFor(phase));
    const states = [...new Set(visuals.map((visual) => visual.state))];
    expect(states).toHaveLength(4);

    const byState = states.map((state) => visuals.find((visual) => visual.state === state)!);
    expect(new Set(byState.map((visual) => visual.flameColor.getHexString())).size).toBe(4);
    expect(new Set(byState.map((visual) => visual.ringColor.getHexString())).size).toBe(4);
    expect(new Set(byState.map((visual) => visual.flameScale)).size).toBe(4);
  });

  /** Unlit must actually read as unlit: the dark states have to be clearly darker. */
  it('keeps undiscovered visibly darker than every lit state', () => {
    const dark = landmarkVisualFor('idle');
    const luminance = (visual: ReturnType<typeof landmarkVisualFor>) =>
      visual.flameColor.r * 0.2126 + visual.flameColor.g * 0.7152 + visual.flameColor.b * 0.0722;
    for (const phase of ['cued', 'engaged', 'revealing', 'complete'] as const) {
      expect(luminance(dark)).toBeLessThan(luminance(landmarkVisualFor(phase)) - 0.1);
    }
  });

  /** Completed is a settled lamp, not a shouting one — calmer than mid-reveal. */
  it('settles the completed flame below the active flame', () => {
    expect(landmarkVisualFor('complete').flameScale).toBeLessThan(landmarkVisualFor('revealing').flameScale);
    expect(landmarkVisualFor('complete').flameScale).toBeGreaterThan(landmarkVisualFor('cued').flameScale);
  });

  it('shows the radial progress arc only while revealing', () => {
    for (const phase of MEMORY_PHASES) {
      expect(landmarkVisualFor(phase).showProgressArc).toBe(phase === 'revealing');
    }
  });

  describe('flame flicker', () => {
    it('never drops out or doubles the flame', () => {
      for (let t = 0; t < 20; t += 0.05) {
        const factor = flameFlicker(t, 1.2, false);
        expect(factor).toBeGreaterThan(0.85);
        expect(factor).toBeLessThan(1.15);
      }
    });

    it('holds perfectly steady for reduced motion without losing the lit state', () => {
      for (let t = 0; t < 5; t += 0.25) expect(flameFlicker(t, 0.7, true)).toBe(1);
    });

    it('is deterministic, so captures of the same frame match', () => {
      expect(flameFlicker(3.25, 0.9, false)).toBe(flameFlicker(3.25, 0.9, false));
    });
  });
});
