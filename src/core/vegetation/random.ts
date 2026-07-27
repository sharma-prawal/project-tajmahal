/**
 * A small, deterministic PRNG (mulberry32) — not `Math.random()` — so
 * vegetation placement is reproducible across reloads/tests/captures
 * (Phase 4E: "controlled procedural variation", not literal randomness
 * that would make every session's garden different and untestable).
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [min, max) using a seeded random source. */
export function randomRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}
