import { ALL_DAY_CALL_ANCHOR } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { placementViolations } from './bridgePlacement';
import type { MemoryId } from './types';

/**
 * Phase 10F.2 — bridge locations, now with authored geometry.
 *
 * A bridge location is Strategy 4 from the 10F report (§8): when a
 * narrative's discovery region and its production anchor are not the same
 * place, author an explicit connective location rather than either
 * pretending they coincide or moving a trigger volume to force it.
 *
 * 10F.1 created these as five `pending-placement` rows with no coordinates,
 * because the report approved a *direction* and left every position open
 * (§14). This phase resolves them on foot: each staged row below has been
 * stood at, at eye height, on its natural approach, and photographed
 * (`artifacts/review/bridge-candidates/`). Rows that did not survive that
 * review are still `pending-placement`, and say why.
 *
 * ## Why the camera offsets live here
 *
 * Every production memory's props are an anchor-relative `<group>`, so
 * moving an anchor moves its whole composition for free. The **camera is
 * not**: its steps are authored in absolute world coordinates. Storing the
 * authored offset (`cameraOffset`/`cameraTargetOffset`) rather than a new
 * absolute position is what lets a bridge move a narrative without
 * recomposing it — the framing that Phase 7 designed is reproduced exactly
 * at the new position, and any drift becomes a test failure instead of a
 * silent re-shoot.
 *
 * ## What a bridge still does not do
 *
 * It does not assert spatial identity. `landmarkAssociation` names the
 * region a bridge sits in; it never completes that spine memory. Only
 * `memoryMapping.ts`'s two `proven` rows do that. A bridge is "this
 * narrative is staged near here", which is a weaker and more honest claim
 * than "this narrative *is* that place".
 */

export type BridgeStatus = 'pending-placement' | 'staged';

type Vec3 = readonly [number, number, number];

export interface BridgeLocation {
  id: string;
  /** System B identity this bridge stages. */
  productionMemoryId: string;
  /** Which discovery region this bridges toward, in words — a region, per 10F, not always a point. */
  discoveryContext: string;
  /**
   * Authored ground position, `null` while pending. Staged rows must pass
   * `placementViolations` — no water, no building, inside navigation bounds,
   * clear of the ceremonial walkways and minaret bases.
   */
  position: Vec3 | null;
  /** Facing, radians about Y — the bearing the composition presents to its approach. */
  orientationY: number | null;
  /** Activation radius, matching the production interaction's own `activationDistance`. */
  activationRadius: number | null;
  /**
   * Camera position/target offsets from the anchor, preserving the authored
   * Phase 7 framing when the anchor moves. `null` when the anchor does not
   * move and the original absolute camera still stands.
   */
  cameraOffset: Vec3 | null;
  cameraTargetOffset: Vec3 | null;
  /** The spine memory whose landmark this bridge sits near — association only, never identity. */
  landmarkAssociation: MemoryId | null;
  /** Journey neighbours, so a route break is visible in data rather than only on foot. */
  previousBeat: string | null;
  nextBeat: string | null;
  /** Journey A uses no hard gating (10F Step 5, option D). */
  activationRule: 'unrestricted';
  status: BridgeStatus;
  /** Why this position, or — for a pending row — what blocked it. Short; detail lives in the phase report. */
  evidenceNote: string;
  contentVersion: 1;
}

export const BRIDGE_LOCATIONS: readonly BridgeLocation[] = [
  {
    id: 'bridge.mints.m1-child-anchor',
    productionMemoryId: 'production.memory.mints',
    discoveryContext: 'near-east (NE) garden — first optional discovery, drawing the player right',
    position: [22, 0.22, -70],
    orientationY: 0.3,
    // 10F.3: was 6.2 here while `MintsMemory` used 5.5. The field's contract is
    // "matching the production interaction's own activationDistance", and
    // nothing checked it — `bridgeStaging.test.ts` now does.
    activationRadius: 5.5,
    cameraOffset: [3.5, 2.33, 5.5],
    cameraTargetOffset: [0, 0.2, 0],
    landmarkAssociation: 'm1',
    previousBeat: null,
    nextBeat: 'production.memory.boarding-passes',
    activationRule: 'unrestricted',
    status: 'staged',
    evidenceNote:
      'Spread pass: moved from the west garden to the near-east (NE) lawn so the first optional discovery pulls the player right rather than left. Same camera composition (offset unchanged), on open lawn south of the east planting beds and clear of the cross-axis walk.',
    contentVersion: 1,
  },
  {
    id: 'bridge.boarding-passes.m2-child-anchor',
    productionMemoryId: 'production.memory.boarding-passes',
    discoveryContext: 'm2 region (SW garden room)',
    position: [-24, 0.02, -105],
    orientationY: 0.2,
    activationRadius: 6.2,
    cameraOffset: [2.2, 2.78, 5.5],
    cameraTargetOffset: [0, 0.33, -29],
    landmarkAssociation: 'm2',
    previousBeat: 'production.memory.mints',
    nextBeat: 'production.memory.little-details',
    activationRule: 'unrestricted',
    status: 'staged',
    evidenceNote:
      'A lawn clearing with the m2 chirag a few metres west, a chattri and a bench in the middle distance. Journey A asked for a "worktable/plinth" that does not exist as an asset; on foot the garden already supplies the reading — shelter, a seat, an enclosed room — so the twelve tiles need no new prop. Camera clears the m2 planting mass by 1.1 m, which is what fixes z at -105.',
    contentVersion: 1,
  },
  {
    id: 'bridge.little-details.m3-east-edge',
    productionMemoryId: 'production.memory.little-details',
    discoveryContext: 'm3 pool court, east edge',
    position: [20, 0.035, -126],
    orientationY: 0.9,
    activationRadius: 6.2,
    cameraOffset: null,
    cameraTargetOffset: null,
    landmarkAssociation: 'm3',
    previousBeat: 'production.memory.boarding-passes',
    nextBeat: 'production.memory.back',
    activationRule: 'unrestricted',
    status: 'staged',
    evidenceNote:
      'Spread pass: mirrored from the west pool edge to the east side of the reflecting pool (SE), so the deep garden is worth exploring on the right too. x=20 sits just outside the pool coping (pool is +/-16); the camera composition is preserved by the same-sign mirror.',
    contentVersion: 1,
  },
  {
    id: 'bridge.friday-night.m6-quiet-subregion',
    productionMemoryId: 'production.memory.friday-night',
    discoveryContext: 'west Taj flank-garden threshold',
    position: [-28.5, 0.03, -163.5],
    orientationY: -0.3,
    activationRadius: 6.2,
    cameraOffset: [0.2, 2.27, 5.2],
    cameraTargetOffset: [0, 0.47, -0.7],
    landmarkAssociation: 'm6',
    previousBeat: 'production.memory.umbrella',
    nextBeat: 'production.memory.all-day-call',
    activationRule: 'unrestricted',
    status: 'staged',
    evidenceNote:
      'Found by rejecting the obvious answer. All four platform-top candidates photographed as featureless open marble under a dominating Taj — the "centre of open marble" the brief forbids. This is at the threshold of the west green flank garden instead: near its first trees without intersecting their trunks and clear of the stair run. Reaching it asks the player to leave the central axis and visit the planting.',
    contentVersion: 1,
  },
  {
    id: 'bridge.all-day-call.m6-m7-approach',
    productionMemoryId: 'production.memory.all-day-call',
    discoveryContext: 'the exterior landing at the Taj main door',
    position: ALL_DAY_CALL_ANCHOR,
    orientationY: 0,
    activationRadius: 6.2,
    cameraOffset: [-5.6, 2.78, 5.5],
    cameraTargetOffset: [0, 0.33, 0],
    landmarkAssociation: 'm7',
    previousBeat: 'production.memory.friday-night',
    nextBeat: null,
    activationRule: 'unrestricted',
    status: 'staged',
    evidenceNote:
      'At the visible main-door threshold, on the exterior side of the permanent gate collider. The nine cadence bars extend back toward the garden in local +Z, so no part of the memory crosses into the Taj.',
    contentVersion: 1,
  },
];

/**
 * Structural problems with the bridge table.
 *
 * Returns messages rather than throwing, matching `validateMemoryMapping`: an
 * authoring mistake should be loud in development and inert in production,
 * never a world that fails to load.
 */
export function validateBridgeLocations(): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();
  const seenProduction = new Set<string>();

  for (const bridge of BRIDGE_LOCATIONS) {
    if (seenIds.has(bridge.id)) problems.push(`duplicate bridge id "${bridge.id}"`);
    seenIds.add(bridge.id);

    if (seenProduction.has(bridge.productionMemoryId)) {
      problems.push(`${bridge.productionMemoryId} is staged by more than one bridge`);
    }
    seenProduction.add(bridge.productionMemoryId);

    if (bridge.status === 'staged') {
      if (!bridge.position) {
        problems.push(`${bridge.id}: staged with no position`);
        continue;
      }
      if (bridge.activationRadius === null) problems.push(`${bridge.id}: staged with no activation radius`);
      if (bridge.orientationY === null) problems.push(`${bridge.id}: staged with no orientation`);

      const [x, , z] = bridge.position;
      for (const violation of placementViolations(x, z)) {
        problems.push(`${bridge.id}: ${violation.rule} — ${violation.detail}`);
      }
      // A camera offset is only meaningful with its target, and vice versa.
      if ((bridge.cameraOffset === null) !== (bridge.cameraTargetOffset === null)) {
        problems.push(`${bridge.id}: camera offset and target offset must be authored together`);
      }
    } else if (bridge.position) {
      problems.push(`${bridge.id}: pending-placement rows must not carry a position`);
    }
  }
  return problems;
}

/** The staged rows a runtime adapter may act on. */
export function stagedBridges(): readonly BridgeLocation[] {
  return BRIDGE_LOCATIONS.filter((bridge) => bridge.status === 'staged' && bridge.position !== null);
}

/** Staged position for a production memory, or `null` if the bridge is still pending. */
export function bridgeAnchorFor(productionMemoryId: string): Vec3 | null {
  const bridge = BRIDGE_LOCATIONS.find((candidate) => candidate.productionMemoryId === productionMemoryId);
  return bridge && bridge.status === 'staged' ? bridge.position : null;
}
