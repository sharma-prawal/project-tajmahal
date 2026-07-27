import { BRIDGE_LOCATIONS } from './bridgeLocations';
import { MEMORY_MAPPING } from './memoryMapping';
import type { MemoryId } from './types';

/**
 * Phase 10F.1 — the canonical emotional order, authored as data.
 *
 * This is **deliberate creative authorship**, approved in
 * `docs/phase-10/phase-10f-canonical-memory-journey.md` ("Journey A —
 * Emotional Escalation"). It is not a recovered historical mapping, and it
 * does not change what `[[production id]]` means to `[[System B]]` or what a
 * `[[MemoryId]]` means to `[[System A]]` — see `memoryMapping.ts`, which
 * remains the only place identity between the two systems is authored.
 *
 * This file adds one thing neither system has: a **presentation order** and,
 * where the design calls for one, a **bridge location** — an honest
 * acknowledgment that a narrative's discovery region and its production
 * anchor are not the same place, without pretending otherwise.
 *
 * ## What this does NOT do
 *
 * - It does not complete a spine memory. Only `memoryMapping.ts`'s `proven`
 *   rows do that, through `MemoryCompletionBridge`. A narrative with
 *   `bridgeLocationId` set and no `spatialMemoryId` never lights a chirag —
 *   there isn't one to light. That is correct: five of seven regions in this
 *   journey have no true spatial identity to complete.
 * - It does not gate discovery. `sequencePrerequisite` is `null` for every
 *   row: Journey A is presentation and finale logic only (10F master prompt
 *   Step 5, option D). A player may find any narrative in any order; this
 *   order is what the world's staging *biases toward*, never what it locks.
 * - It does not carry positions. Phase 10F.2 resolved the five child-anchor
 *   placements on foot and they live in `bridgeLocations.ts`, which owns
 *   geometry; this file owns order and role. `journeyBridgeStatus` reads the
 *   former so the two can never disagree.
 */

export type JourneyRole = 'opening' | 'discovery' | 'midpoint' | 'pre-finale' | 'culmination';

export interface CanonicalJourneyEntry {
  /** 1-7, the approved emotional sequence. Presentation only — see module doc. */
  order: number;
  /** System B identity, matching `MemoryMappingRow.productionMemoryId`. */
  productionMemoryId: string;
  /** Stable id for this journey's own presentation concerns (e.g. UI ordering keys). */
  canonicalJourneyId: string;
  /** System A identity this narrative completes, if any. Mirrors `memoryMapping.ts`'s proven rows — never authored independently of it. */
  spatialMemoryId: MemoryId | null;
  /**
   * The bridge location this narrative stages through, if the design calls
   * for one. Whether that bridge is actually *staged* is not repeated here —
   * `bridgeLocations.ts` owns it, and `journeyBridgeStatus` reads it, so the
   * two files cannot disagree.
   */
  bridgeLocationId: string | null;
  role: JourneyRole;
  /** Always null in Journey A — see module doc. Kept explicit rather than omitted, so "no prerequisite" is a decision, not an absence. */
  sequencePrerequisite: string | null;
  /** Design source, not narrative prose — the "why" lives in the cited document. */
  designRationale: string;
  contentVersion: 1;
}

/**
 * The seven rows, in the approved order. `spatialMemoryId` for `back` and
 * `umbrella` is asserted against `MEMORY_MAPPING` at module load (see
 * `canonicalJourney.test.ts`) so this table cannot silently drift from the
 * one place identity is actually decided.
 */
export const CANONICAL_JOURNEY: readonly CanonicalJourneyEntry[] = [
  {
    order: 1,
    productionMemoryId: 'production.memory.mints',
    canonicalJourneyId: 'journey.1.mints',
    spatialMemoryId: null,
    bridgeLocationId: 'bridge.mints.m1-child-anchor',
    role: 'opening',
    sequencePrerequisite: null,
    designRationale:
      'Journey A §5 seq. 1: "selective delight" opener, staged in the m1 region (10F.2, position in bridgeLocations.ts). Mints -> m2 was evaluated and rejected as identity (approval packet §A row 3): PLAUSIBLE object echo, contradicted by 42.6 m and the wrong side of the garden. Staging near m1 asserts proximity, not identity.',
    contentVersion: 1,
  },
  {
    order: 2,
    productionMemoryId: 'production.memory.boarding-passes',
    canonicalJourneyId: 'journey.2.boarding-passes',
    spatialMemoryId: null,
    bridgeLocationId: 'bridge.boarding-passes.m2-child-anchor',
    role: 'discovery',
    sequencePrerequisite: null,
    designRationale:
      'Journey A §5 seq. 2: "chosen effort," staged in the SW garden room beside the m2 chirag (10F.2). The report\'s "worktable/plinth" does not exist as an asset; on foot the garden\'s own chattri and bench supply the reading without one.',
    contentVersion: 1,
  },
  {
    order: 3,
    productionMemoryId: 'production.memory.little-details',
    canonicalJourneyId: 'journey.3.little-details',
    spatialMemoryId: null,
    bridgeLocationId: 'bridge.little-details.m3-east-edge',
    role: 'discovery',
    sequencePrerequisite: null,
    designRationale:
      'Journey A §5 seq. 3: "effortless openness." Staged where Phase 7 already put it — inside m3 at the west pool edge, which is what Journey A asks for. The m3 tie with Friday Night (evidence audit §8) dissolves now that Friday Night is staged at m6. m3 remains ambiguous in memoryMapping.ts: co-location, not identity.',
    contentVersion: 1,
  },
  {
    order: 4,
    productionMemoryId: 'production.memory.back',
    canonicalJourneyId: 'journey.4.back',
    spatialMemoryId: 'm4',
    bridgeLocationId: null,
    role: 'midpoint',
    sequencePrerequisite: null,
    designRationale:
      'Journey A §5 seq. 4: "dependable return." Proven mapping (memoryMapping.ts), preserved unchanged — no bridge needed, the west pavilion already is the place.',
    contentVersion: 1,
  },
  {
    order: 5,
    productionMemoryId: 'production.memory.umbrella',
    canonicalJourneyId: 'journey.5.umbrella',
    spatialMemoryId: 'm5',
    bridgeLocationId: null,
    role: 'midpoint',
    sequencePrerequisite: null,
    designRationale:
      'Journey A §5 seq. 5: "practical care." Proven mapping (memoryMapping.ts), preserved unchanged.',
    contentVersion: 1,
  },
  {
    order: 6,
    productionMemoryId: 'production.memory.friday-night',
    canonicalJourneyId: 'journey.6.friday-night',
    spatialMemoryId: null,
    bridgeLocationId: 'bridge.friday-night.m6-quiet-subregion',
    role: 'pre-finale',
    sequencePrerequisite: null,
    designRationale:
      'Journey A §5 seq. 6: "accepted vulnerability," staged at the east foot of the platform plinth inside m6 (10F.2). Every platform-*top* candidate was rejected on foot as open marble under a dominating Taj. m6 remains the pre-finale chapter region (10F §10), not a completable narrative.',
    contentVersion: 1,
  },
  {
    order: 7,
    productionMemoryId: 'production.memory.all-day-call',
    canonicalJourneyId: 'journey.7.all-day-call',
    spatialMemoryId: null,
    bridgeLocationId: 'bridge.all-day-call.m6-m7-approach',
    role: 'culmination',
    sequencePrerequisite: null,
    designRationale:
      'Journey A §5 seq. 7: "quiet devotion," the arc\'s resolution. Staged on the m6->m7 approach so the cadence completes before the landing (10F §10); the stair climb from Friday Night supplies the handoff. Cadence marks stay the authored ground tiles — 10F §14 item 5 is answered by not adding light. m7 hosts no full narrative (10F §12): culmination and entry-state only.',
    contentVersion: 1,
  },
];

/** Fails loudly in development if this table drifts from the one place identity is authored. */
export function validateCanonicalJourney(): string[] {
  const problems: string[] = [];
  const seenOrders = new Set<number>();
  const seenProduction = new Set<string>();
  const seenCanonicalIds = new Set<string>();

  for (const entry of CANONICAL_JOURNEY) {
    if (seenOrders.has(entry.order)) problems.push(`order ${entry.order} is used more than once`);
    seenOrders.add(entry.order);

    if (seenProduction.has(entry.productionMemoryId)) {
      problems.push(`${entry.productionMemoryId} appears more than once in the journey`);
    }
    seenProduction.add(entry.productionMemoryId);

    if (seenCanonicalIds.has(entry.canonicalJourneyId)) {
      problems.push(`canonicalJourneyId "${entry.canonicalJourneyId}" is used more than once`);
    }
    seenCanonicalIds.add(entry.canonicalJourneyId);

    const mappingRow = MEMORY_MAPPING.find((row) => row.productionMemoryId === entry.productionMemoryId);
    if (!mappingRow) {
      problems.push(`${entry.productionMemoryId}: no row in memoryMapping.ts`);
      continue;
    }

    // The journey's spatialMemoryId must never assert an identity memoryMapping.ts hasn't proven.
    const provenSpatialId = mappingRow.mappingStatus === 'proven' ? mappingRow.spatialMemoryId : null;
    if (entry.spatialMemoryId !== provenSpatialId) {
      problems.push(
        `${entry.productionMemoryId}: journey claims spatialMemoryId "${entry.spatialMemoryId}" but memoryMapping.ts proves "${provenSpatialId}"`,
      );
    }

    // A proven spatial identity needs no bridge; everything else must name one
    // that actually exists.
    if (provenSpatialId !== null && entry.bridgeLocationId !== null) {
      problems.push(`${entry.productionMemoryId}: has a proven spatial identity and must not also name a bridge`);
    }
    if (provenSpatialId === null && entry.bridgeLocationId === null) {
      problems.push(`${entry.productionMemoryId}: has no spatial identity and no bridge to stage it`);
    }
    if (entry.bridgeLocationId && !BRIDGE_LOCATIONS.some((bridge) => bridge.id === entry.bridgeLocationId)) {
      problems.push(`${entry.productionMemoryId}: references unknown bridge "${entry.bridgeLocationId}"`);
    }
  }

  if (seenOrders.size !== 7 || Math.min(...seenOrders) !== 1 || Math.max(...seenOrders) !== 7) {
    problems.push(`journey order must be exactly 1-7, got: ${[...seenOrders].sort((a, b) => a - b).join(',')}`);
  }

  return problems;
}

/**
 * Whether this journey beat is physically staged in the world yet.
 *
 * `direct` — a proven spatial identity, no bridge needed (Back, Umbrella).
 * `staged` — its bridge has an authored, on-foot-reviewed position.
 * `pending` — its bridge exists but has no position, so the beat is still
 *   experienced at its original Phase 7 anchor.
 */
export function journeyBridgeStatus(productionMemoryId: string): 'direct' | 'staged' | 'pending' {
  const entry = CANONICAL_JOURNEY.find((row) => row.productionMemoryId === productionMemoryId);
  if (!entry || entry.bridgeLocationId === null) return 'direct';
  const bridge = BRIDGE_LOCATIONS.find((row) => row.id === entry.bridgeLocationId);
  return bridge && bridge.status === 'staged' ? 'staged' : 'pending';
}
