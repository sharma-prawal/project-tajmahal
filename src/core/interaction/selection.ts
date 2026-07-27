import type { InteractionCandidate, InteractionDefinition, InteractionDiagnostic, InteractionObserver } from './types';

export const FOCUS_RANGE_HYSTERESIS_METRES = 0.75;
export const FOCUS_ANGLE_HYSTERESIS_DEGREES = 8;
export const FOCUS_SWITCH_DISTANCE_MARGIN_METRES = 0.6;

function compare(a: InteractionCandidate, b: InteractionCandidate): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  if (a.alignment !== b.alignment) return b.alignment - a.alignment;
  if (a.distance !== b.distance) return a.distance - b.distance;
  return a.id.localeCompare(b.id);
}

function evaluate(
  definition: InteractionDefinition,
  observer: InteractionObserver,
  completedIds: ReadonlySet<string>,
  persistedIds: ReadonlySet<string>,
  retained: boolean,
): InteractionDiagnostic {
  const dx = definition.position[0] - observer.x;
  const dy = definition.position[1] - observer.y;
  const dz = definition.position[2] - observer.z;
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  const distance = Math.sqrt(distanceSquared);
  const inverseDistance = distance > 0.0001 ? 1 / distance : 0;
  const alignment = distance > 0.0001
    ? (dx * observer.forwardX + dy * observer.forwardY + dz * observer.forwardZ) * inverseDistance
    : 1;
  const scale = Math.min(1.5, Math.max(1, observer.distanceScale ?? 1));
  const range = definition.activationDistance * scale + (retained ? FOCUS_RANGE_HYSTERESIS_METRES : 0);
  const rangeEligible = distanceSquared <= range * range;
  const angleLimit = definition.focusAngleDegrees === undefined
    ? 180
    : definition.focusAngleDegrees + (retained ? FOCUS_ANGLE_HYSTERESIS_DEGREES : 0);
  const angleEligible = definition.type !== 'view-and-proximity' || alignment >= Math.cos((angleLimit * Math.PI) / 180);
  const completed = completedIds.has(definition.id);
  const persisted = persistedIds.has(definition.id);
  const eligible = definition.enabled !== false && rangeEligible && angleEligible && !(definition.behavior === 'one-shot' && completed);
  return {
    id: definition.id,
    distance,
    alignment,
    priority: definition.priority ?? 0,
    retained,
    eligible,
    angleEligible,
    rangeEligible,
    occlusion: 'not-evaluated',
    persisted,
  };
}

export interface SelectionResult {
  selected: InteractionCandidate | null;
  diagnostics: InteractionDiagnostic[];
}

export function selectInteraction(
  definitions: Iterable<InteractionDefinition>,
  observer: InteractionObserver,
  completedIds: ReadonlySet<string>,
  currentFocusId: string | null,
  persistedIds: ReadonlySet<string> = completedIds,
): SelectionResult {
  const diagnostics: InteractionDiagnostic[] = [];
  let current: InteractionDiagnostic | null = null;
  const eligible: InteractionDiagnostic[] = [];
  for (const definition of definitions) {
    const result = evaluate(definition, observer, completedIds, persistedIds, definition.id === currentFocusId);
    diagnostics.push(result);
    if (result.id === currentFocusId) current = result;
    if (result.eligible) eligible.push(result);
  }
  eligible.sort(compare);
  const best = eligible[0] ?? null;
  if (!current?.eligible || !best || best.id === current.id) return { selected: best, diagnostics };
  if (best.priority > current.priority) return { selected: best, diagnostics };
  if (best.priority === current.priority && best.distance + FOCUS_SWITCH_DISTANCE_MARGIN_METRES < current.distance) {
    return { selected: best, diagnostics };
  }
  return { selected: current, diagnostics };
}
