/**
 * Phase 10F.2 — URL parsing for the dev-only bridge review overlay.
 *
 * Separate from the component so it is testable without a renderer, and so
 * the overlay file exports only a component. Every parser drops malformed
 * input rather than coercing it: a review tool that silently reinterprets a
 * typo'd coordinate would put a marker somewhere nobody asked for, which is
 * precisely the failure mode this phase exists to avoid.
 */

export interface ReviewCandidate {
  label: string;
  x: number;
  z: number;
}

/** `A:-23.5,-59.5|B:-29,-58` — malformed entries are dropped, never guessed at. */
export function parseCandidates(value: string | null): ReviewCandidate[] {
  if (!value) return [];
  return value
    .split('|')
    .map((entry) => {
      const [label, coords] = entry.split(':');
      if (!label || !coords) return null;
      const parts = coords.split(',').map(Number);
      if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) return null;
      return { label, x: parts[0], z: parts[1] };
    })
    .filter((candidate): candidate is ReviewCandidate => candidate !== null);
}

/** `x1,z1,x2,z2` for a sightline between two ground points. */
export function parseSightline(value: string | null): [number, number, number, number] | null {
  if (!value) return null;
  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  return [parts[0], parts[1], parts[2], parts[3]];
}
