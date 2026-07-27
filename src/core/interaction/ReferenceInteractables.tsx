import { useMemo } from 'react';
import { env } from '@config/env';
import type { InteractionDefinition } from './types';
import { useInteractable } from './useInteractable';

const FIXTURES: readonly InteractionDefinition[] = [
  {
    id: 'dev.garden-marker', type: 'proximity', position: [18, 1.2, -46], activationDistance: 6,
    priority: 1, behavior: 'repeatable', prompt: 'Observe garden marker', accessibilityLabel: 'Observe the garden validation marker', cooldownMs: 650,
  },
  {
    id: 'dev.architecture-marker', type: 'view-and-proximity', position: [10, 1.2, -57], activationDistance: 7,
    focusAngleDegrees: 60, priority: 4, behavior: 'repeatable', prompt: 'Study architectural marker', accessibilityLabel: 'Study the architectural validation marker', cooldownMs: 650,
  },
  {
    id: 'dev.persisted-marker', type: 'view-and-proximity', position: [18, 1.2, -69], activationDistance: 7,
    focusAngleDegrees: 60, priority: 5, behavior: 'one-shot', persistence: 'completion', prompt: 'Acknowledge garden detail', accessibilityLabel: 'Acknowledge the persisted interaction validation marker',
  },
  {
    id: 'dev.repeatable-marker', type: 'proximity', position: [18, 1.2, -81], activationDistance: 7,
    priority: 2, behavior: 'repeatable', prompt: 'Revisit garden detail', accessibilityLabel: 'Revisit the repeatable interaction validation marker', cooldownMs: 650,
  },
];

function Fixture({ source }: { source: InteractionDefinition }) {
  const definition = useMemo(() => ({ ...source, onActivate: () => undefined }), [source]);
  useInteractable(definition);
  return null;
}

/** Non-narrative validation content; excluded unless developer tooling is explicitly enabled. */
export function ReferenceInteractables() {
  if (!env.enableDebugTools) return null;
  return <>{FIXTURES.map((fixture) => <Fixture key={fixture.id} source={fixture} />)}</>;
}
