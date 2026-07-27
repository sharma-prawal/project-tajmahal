import type { MemoryDefinition, MemoryId } from './types';
import { MEMORY_IDS } from './types';

/** The six garden memories that must be complete before the Taj memory wakes. */
export const FINAL_MEMORY_PREREQUISITES = MEMORY_IDS.filter((id) => id !== 'm7');

export function isFinalMemoryUnlocked(completedIds: readonly MemoryId[]): boolean {
  const completed = new Set(completedIds);
  return FINAL_MEMORY_PREREQUISITES.every((id) => completed.has(id));
}

export function isDoorUnlocked(completedCount: number, threshold: number): boolean {
  return completedCount >= threshold;
}

/**
 * Proves the door can never become permanently un-openable ("memory-gate
 * deadlock test", Part 4/12): the unmissable memories plus the optional
 * pool must be large enough to reach the threshold, with no ordering
 * dependency between them (every memory is independently completable).
 */
export function canAlwaysReachThreshold(definitions: MemoryDefinition[], threshold: number): boolean {
  return definitions.length >= threshold;
}

/** How many optional memories a player who only completes unmissable ones must additionally finish to reach the threshold. */
export function requiredOptionalCount(definitions: MemoryDefinition[], threshold: number): number {
  const unmissableCount = definitions.filter((d) => d.classification === 'unmissable').length;
  return Math.max(0, threshold - unmissableCount);
}

/**
 * Guidance data only (Part 3: "nearest incomplete memory guidance data, but
 * no final HUD guidance") — returns the closest not-yet-complete memory to
 * a world position, or null if everything is complete. Callers decide
 * whether/how to surface this; it is never rendered as text/UI here.
 */
export function nearestIncompleteMemory(
  definitions: MemoryDefinition[],
  completedIds: MemoryId[],
  position: { x: number; y: number; z: number },
): MemoryDefinition | null {
  const incomplete = definitions.filter((d) => !completedIds.includes(d.id));
  if (incomplete.length === 0) return null;

  let closest = incomplete[0];
  let closestDistSq = Infinity;
  for (const def of incomplete) {
    const dx = def.location.x - position.x;
    const dy = def.location.y - position.y;
    const dz = def.location.z - position.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq < closestDistSq) {
      closestDistSq = distSq;
      closest = def;
    }
  }
  return closest;
}
