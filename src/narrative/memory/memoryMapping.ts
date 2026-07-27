import { MEMORY_DEFINITIONS } from './definitions';
import { LANDMARK_PLACEMENTS } from './landmarkPlacement';
import type { MemoryId } from './types';

/**
 * Phase 10E.1 — the identity contract between the two memory systems.
 *
 * **Identity is authored here, never inferred at runtime.** Nothing in this
 * file may be derived from proximity, array order, or name similarity. A row
 * exists because someone could point at evidence; everything else is `unknown`,
 * and `unknown` is a valid, visible, permanent-until-decided state.
 *
 * That rule is the whole point. The two systems place seven memories each, and
 * three production anchors happen to fall inside spine volumes — so a
 * nearest-anchor heuristic would produce a confident, wrong, and completely
 * unfalsifiable mapping. The remaining five decisions belong to the content
 * owner (see `docs/phase-9/phase-10e1-mapping-worksheet.md`).
 *
 * ## What each status means
 *
 * - `proven` — independent evidence agrees and the pairing is one-to-one. Wired
 *   automatically by the completion bridge.
 * - `likely` — suggestive but not decisive. **Not wired.** Recorded so the
 *   argument is not re-litigated from scratch each phase.
 * - `ambiguous` — more than one candidate fits and nothing separates them.
 *   **Not wired.**
 * - `unknown` — no spatial or documentary relationship at all. **Not wired.**
 *
 * ## Contract questions, answered
 *
 * - *Which narrative belongs to which place?* `spatialMemoryId` — or nothing.
 * - *Which chirag represents it?* Derived from `spatialMemoryId` through
 *   `LANDMARK_PLACEMENTS`; a spine memory may own several lamps (threshold and
 *   gateway pairs), and completing it lights all of them. Mirrored pairs are
 *   therefore *not* separate identities — they are one memory's presentation.
 * - *Which trigger starts it?* `triggerInteractionId` for the narrative; the
 *   spine volume is `spatialMemoryId`'s own `discoveryRadius`. A memory can
 *   legitimately have both, and today `back` and `umbrella` do.
 * - *Which ledger records it?* Both, independently. This bridge adds a one-way
 *   edge (production → spine) and never the reverse, so a spine completion can
 *   never fabricate a narrative the player did not watch.
 * - *Is it final?* `mappingStatus === 'proven'` is final. Everything else is
 *   provisional by construction.
 * - *What if a narrative moves?* Nothing breaks: the row is authored against
 *   ids, not coordinates. If the move invalidates the evidence, the status must
 *   be downgraded by hand — which is the intended friction.
 * - *What if a spatial volume changes?* Same. `validateMemoryMapping` catches a
 *   row whose ids no longer resolve.
 * - *Can two narratives share a location?* Yes — `m3` contains both pool
 *   anchors today. The contract allows many-to-one; it simply refuses to guess
 *   which one owns the lamp.
 * - *Can one narrative span several volumes?* Not expressible, deliberately. No
 *   evidence any narrative needs it, and allowing it would make "is this
 *   memory complete" ambiguous.
 */
export type MappingStatus = 'proven' | 'likely' | 'ambiguous' | 'unknown';

export interface MemoryMappingRow {
  /** System B identity. Always present — the seven narratives are the fixed set. */
  productionMemoryId: string;
  narrativeTitle: string;
  triggerInteractionId: string;
  /** Authored anchor, for the worksheet and for `validateMemoryMapping`. */
  anchor: readonly [number, number, number];
  /** System A identity — `null` until a human decides. */
  spatialMemoryId: MemoryId | null;
  mappingStatus: MappingStatus;
  /** Where the world puts it, in words, so the worksheet reads without a map. */
  locationDescription: string;
  /** Why this status. For `unknown`, why no mapping could be made. */
  designRationale: string;
}

/**
 * The seven narratives.
 *
 * Two rows are `proven`, and the evidence is the same in both cases and
 * independent of distance:
 *
 * 1. Both systems derive the anchor from the **same `PAVILION.axisOffset`
 *    constant** — the spine memory and the narrative are placed at the same
 *    named architectural feature by construction, not by coincidence.
 * 2. Phase 7's own engineering reports name the pavilion outright: *"Back
 *    occupies the west pavilion; the mirrored east pavilion provides a distinct
 *    sheltered anchor"* (7D), *"a west-pavilion interaction"* (7C), *"The
 *    player discovers `Remember The Umbrella` inside the east pavilion"* (7D).
 * 3. The pairing is **one-to-one**: exactly one spine memory and exactly one
 *    narrative sit at each pavilion. No other candidate exists for either side.
 *
 * The other five fail at least one of those three tests, and are left `unknown`
 * or `ambiguous` rather than resolved by the nearest-anchor rule that would
 * have "solved" all of them.
 */
export const MEMORY_MAPPING: readonly MemoryMappingRow[] = [
  {
    productionMemoryId: 'production.memory.back',
    narrativeTitle: 'A Touch of Sanity',
    triggerInteractionId: 'interaction.memory.back',
    anchor: [-25.7, 0, -141.5],
    spatialMemoryId: 'm4',
    mappingStatus: 'proven',
    locationDescription: 'West approach pavilion',
    designRationale:
      'West pavilion threshold shared with m4; one-to-one — the only spine memory and the only narrative at that pavilion.',
  },
  {
    productionMemoryId: 'production.memory.umbrella',
    narrativeTitle: 'Fried Rice & Love',
    triggerInteractionId: 'interaction.memory.umbrella',
    anchor: [25.7, 0, -141.5],
    spatialMemoryId: 'm5',
    mappingStatus: 'proven',
    locationDescription: 'East approach pavilion',
    designRationale:
      'Mirror of the Back/m4 case at the east pavilion threshold; one-to-one at that pavilion.',
  },
  {
    productionMemoryId: 'production.memory.little-details',
    narrativeTitle: 'The Careless Days',
    triggerInteractionId: 'interaction.memory.little-details',
    anchor: [-20, 0.035, -126],
    spatialMemoryId: null,
    mappingStatus: 'ambiguous',
    locationDescription: 'West side of the reflecting pool',
    designRationale:
      'Inside m3 (20.0 m of a 22 m radius) — but so is Family & Blessings, at exactly the same distance.',
  },
  {
    productionMemoryId: 'production.memory.friday-night',
    narrativeTitle: 'Family & Blessings',
    triggerInteractionId: 'interaction.memory.friday-night',
    anchor: [20, 0.03, -126],
    spatialMemoryId: null,
    mappingStatus: 'ambiguous',
    locationDescription: 'East side of the reflecting pool',
    designRationale:
      'The mirror of The Careless Days, and the same tie: both sit 20.0 m from m3’s centre inside its 22 m radius.',
  },
  {
    productionMemoryId: 'production.memory.mints',
    narrativeTitle: 'Warmth in Absence',
    triggerInteractionId: 'interaction.memory.mints',
    anchor: [12, 0.22, -74],
    spatialMemoryId: null,
    mappingStatus: 'unknown',
    locationDescription: 'Mid-garden, east of the central channel',
    designRationale:
      'Inside no spine volume; 42.6 m from the nearest (m1).',
  },
  {
    productionMemoryId: 'production.memory.all-day-call',
    narrativeTitle: 'Through Every Emotion',
    triggerInteractionId: 'interaction.memory.all-day-call',
    anchor: [51, 0.02, -72],
    spatialMemoryId: null,
    mappingStatus: 'unknown',
    locationDescription: 'Far east garden edge',
    designRationale:
      'Inside no spine volume; 71.3 m from the nearest (m5).',
  },
  {
    productionMemoryId: 'production.memory.boarding-passes',
    narrativeTitle: 'The Birthday Gift',
    triggerInteractionId: 'interaction.memory.boarding-passes',
    anchor: [-51, 0.02, -72],
    spatialMemoryId: null,
    mappingStatus: 'unknown',
    locationDescription: 'Far west garden edge',
    designRationale:
      'Mirror of Through Every Emotion; inside no spine volume.',
  },
];

/** The rows the completion bridge is allowed to act on. */
export function provenMappings(): readonly MemoryMappingRow[] {
  return MEMORY_MAPPING.filter((row) => row.mappingStatus === 'proven' && row.spatialMemoryId !== null);
}

/** The spine memory a completed narrative should light, or `null` if undecided. */
export function spatialMemoryForProduction(productionMemoryId: string): MemoryId | null {
  const row = MEMORY_MAPPING.find((candidate) => candidate.productionMemoryId === productionMemoryId);
  return row && row.mappingStatus === 'proven' ? row.spatialMemoryId : null;
}

/**
 * Structural problems with the contract itself — a row naming a spine memory or
 * a landmark that no longer exists, a duplicate claim on one spine slot, or a
 * `proven` row with nothing to map to.
 *
 * Returns messages rather than throwing: an authoring mistake should surface
 * loudly in development and degrade to "that lamp does not light" in
 * production, never to a world that fails to load.
 */
export function validateMemoryMapping(): string[] {
  const problems: string[] = [];
  const spineIds = new Set(MEMORY_DEFINITIONS.map((definition) => definition.id));
  const landmarkOwners = new Set(LANDMARK_PLACEMENTS.map((placement) => placement.memoryId));
  const claimed = new Map<MemoryId, string>();

  for (const row of MEMORY_MAPPING) {
    if (row.mappingStatus === 'proven') {
      if (!row.spatialMemoryId) {
        problems.push(`${row.productionMemoryId}: status "proven" with no spatialMemoryId`);
        continue;
      }
      if (!spineIds.has(row.spatialMemoryId)) {
        problems.push(`${row.productionMemoryId}: maps to unknown spatial memory "${row.spatialMemoryId}"`);
      }
      if (!landmarkOwners.has(row.spatialMemoryId)) {
        problems.push(`${row.productionMemoryId}: "${row.spatialMemoryId}" has no landmark to light`);
      }
      const existing = claimed.get(row.spatialMemoryId);
      if (existing) {
        problems.push(`${row.spatialMemoryId} is claimed by both ${existing} and ${row.productionMemoryId}`);
      }
      claimed.set(row.spatialMemoryId, row.productionMemoryId);
    } else if (row.spatialMemoryId) {
      problems.push(`${row.productionMemoryId}: status "${row.mappingStatus}" must not name a spatialMemoryId`);
    }
  }
  return problems;
}
