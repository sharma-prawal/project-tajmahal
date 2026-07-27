import { Color } from 'three';
import type { MemoryPhase } from './types';

/**
 * Phase 10D.1 — the four-state visual language, as a pure function.
 *
 * The brief asks for four states the player can read without any HUD:
 *
 * | Player-facing state | Engine phase(s)        | What the lamp does |
 * |---------------------|------------------------|--------------------|
 * | Undiscovered        | `idle`                 | Unlit. Dark unfilled inlay. |
 * | Nearby              | `cued`                 | An ember catches. Inlay warms. |
 * | Active              | `engaged`, `revealing` | Flame rises; the inlay fills round. |
 * | Completed           | `complete`             | A steady lit lamp, inlay filled for good. |
 *
 * The engine has five phases and the player is shown four states, because
 * `engaged` and `revealing` are one thing from outside the machine: something
 * is happening here. Nothing in the state machine changes to accommodate this —
 * this maps onto it.
 *
 * Colours come out as plain `Color`s rather than materials because both the
 * flame and the inlay are drawn with **unlit** (`MeshBasicMaterial`)
 * per-instance vertex colours. `vertexColors` drives `diffuse` only — three
 * has no per-instance emissive — so an unlit material is what lets ten
 * landmarks in four different states share a single draw call. It also happens
 * to be the right look: a flame is a light source, not a lit surface.
 */
export type LandmarkState = 'undiscovered' | 'nearby' | 'active' | 'completed';

export interface LandmarkVisual {
  state: LandmarkState;
  /** Tint for the inlay ring on the plinth. */
  ringColor: Color;
  /** Tint for the flame in the lamp cup. */
  flameColor: Color;
  /** Multiplier on the flame's size — a caught ember is smaller than a risen flame. */
  flameScale: number;
  /** True while the radial reveal arc should be drawn over the ring. */
  showProgressArc: boolean;
}

export function landmarkStateFor(phase: MemoryPhase): LandmarkState {
  switch (phase) {
    case 'idle': return 'undiscovered';
    case 'cued': return 'nearby';
    case 'engaged':
    case 'revealing': return 'active';
    case 'complete': return 'completed';
  }
}

/**
 * Palette. The lit values are lamp-flame colours, not UI colours: ember through
 * to a settled warm gold. The unlit ring is the grey-violet of unfilled pietra
 * dura — dark enough to read as an empty channel cut into white marble, never
 * as a switched-off light.
 */
const RING = {
  undiscovered: new Color('#2e2a34'),
  nearby: new Color('#8a6234'),
  // Active is the *brightest and palest* — energy, something happening now.
  active: new Color('#ffd98f'),
  // Completed is deeper and warmer — filled carnelian, settled rather than lit.
  // The first palette made these two near-identical golds and the capture grid
  // could not tell them apart.
  completed: new Color('#cf8c3d'),
} as const;

const FLAME = {
  undiscovered: new Color('#241f28'),
  nearby: new Color('#c9702c'),
  active: new Color('#fff3d6'),
  completed: new Color('#ffb454'),
} as const;

const FLAME_SCALE = {
  undiscovered: 0,
  nearby: 0.48,
  active: 0.78,
  completed: 0.58,
} as const;

export function landmarkVisualFor(phase: MemoryPhase): LandmarkVisual {
  const state = landmarkStateFor(phase);
  return {
    state,
    ringColor: RING[state],
    flameColor: FLAME[state],
    flameScale: FLAME_SCALE[state],
    showProgressArc: phase === 'revealing',
  };
}

/**
 * Flame flicker, as a multiplier on `flameScale`.
 *
 * Two summed sines rather than random: it must be deterministic (the capture
 * harness has to be able to shoot the same frame twice) and it must never fully
 * drop out. `phaseOffset` keeps ten lamps from breathing in unison, which is
 * the thing that would make them read as UI markers instead of fire.
 *
 * Returns exactly 1 for reduced motion — a steady lamp is still a lit lamp, so
 * no state information is lost by holding it still.
 */
export function flameFlicker(time: number, phaseOffset: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  const slow = Math.sin(time * 2.1 + phaseOffset);
  const fast = Math.sin(time * 5.7 + phaseOffset * 2.3);
  return 1 + slow * 0.055 + fast * 0.028;
}
