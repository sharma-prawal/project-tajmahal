import { DOOR_UNLOCK_THRESHOLD, MEMORY_DEFINITIONS } from './definitions';

/**
 * Phase 10E — the single progression question, answered in one place.
 *
 * ## The defect this closes
 *
 * The project has two memory systems, and until now only one of them could open
 * the mausoleum door. A player could complete all seven *production* memories —
 * every line of the seven real memories, every world effect — and find the door
 * still shut, because `isDoorUnlocked()` read the Phase 3A dwell spine and
 * nothing else. Conversely, walking through five spheres opened it having read
 * nothing. Both halves are proven in `progressionDefect.test.ts`.
 *
 * ## Why `max` and not a union
 *
 * The obvious fix is to union the two completion sets. It is wrong, because the
 * two sets are **not the same seven things**:
 *
 * - the spine (`m1…m7`) is seven *places* — garden quadrants, pool, pavilions,
 *   platform, door — each with a discovery volume;
 * - the production set is seven *narratives*, anchored to authored props at
 *   coordinates the spine never knew about.
 *
 * Three production anchors do sit inside spine volumes (`back` in m4,
 * `umbrella` in m5, `little-details` and `friday-night` in m3's 22 m radius), so
 * a naive union would double-count those places. Deduplicating by containment
 * would then leave a 10-unit denominator, and the design spec's "**door
 * requires 5 of 7 notches**" (`docs/phase-2/04-memory-system.md`) would no
 * longer mean anything.
 *
 * There is **no authored mapping** between the two sets, and inventing one would
 * be fabricating design intent that no document contains. So this takes the
 * honest bridge instead: each system has exactly seven memories, the design says
 * five of seven, and **either path counts**. Completing five spine volumes opens
 * the door. Completing five production memories opens the door. Nothing is
 * double-counted and nothing is invented.
 *
 * This is deliberately a *bridge*, not the end state. The end state is one
 * memory list where each entry has both a place and a timeline — see the Phase
 * 10E report's roadmap.
 *
 * ## Monotonicity — the safety property
 *
 * `max` can only ever return a value **greater than or equal to** the old
 * spine-only count. A save that was unlocked before is unlocked after. This is
 * the one property that mattered: no player can be locked out of the mausoleum
 * by an architecture change. Asserted directly in `memoryProgress.test.ts`.
 */

/** Distinct memories a player must complete to open the mausoleum door. */
export const MEMORY_GATE_THRESHOLD = DOOR_UNLOCK_THRESHOLD;

/** Total memories in each system — both are seven, which is why `max` is fair. */
export const SPINE_MEMORY_COUNT = MEMORY_DEFINITIONS.length;

/** Six memories unlock the authored stair flights leading to the seventh. */
export const FINAL_MEMORY_APPROACH_THRESHOLD = SPINE_MEMORY_COUNT - 1;

/**
 * Progress toward the gate, from both systems' completion counts.
 *
 * Pure and total: negative or non-finite inputs clamp to 0 rather than throwing,
 * because this sits between a save file and a door and must never be the reason
 * a world fails to load.
 */
export function memoryGateProgress(spineCompleted: number, productionCompleted: number): number {
  const clamp = (value: number) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
  return Math.max(clamp(spineCompleted), clamp(productionCompleted));
}

/** Whether the mausoleum door is open, given both systems' completion counts. */
export function isMausoleumDoorUnlocked(spineCompleted: number, productionCompleted: number): boolean {
  return memoryGateProgress(spineCompleted, productionCompleted) >= MEMORY_GATE_THRESHOLD;
}

/** Whether the player can climb the Taj stairs to reach the seventh memory. */
export function isFinalMemoryApproachUnlocked(spineCompleted: number, productionCompleted: number): boolean {
  return memoryGateProgress(spineCompleted, productionCompleted) >= FINAL_MEMORY_APPROACH_THRESHOLD;
}
