import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlayerTarget } from '@core/camera/PlayerTargetContext';
import { useInteractable } from '@core/interaction/useInteractable';
import { ownershipManager } from '@core/memoryRuntime/OwnershipManager';
import { isExplorationModalOpen } from '@state/useExperienceSettingsStore';
import { advanceMemoryVolume } from './memoryVolumeTick';
import { useMemoryStore } from './useMemoryStore';
import { useMemoryRevealStore } from './useMemoryRevealStore';
import { useLandmarkCaptureStore } from './useLandmarkCaptureStore';
import { isFinalMemoryUnlocked } from './progression';
import type { MemoryDefinition } from './types';

/**
 * Generic, shared interaction wiring for exactly one memory — the same
 * component runs all seven `MemoryDefinition`s (Part 6: "run them through
 * shared systems," not seven bespoke components): proximity cue, optional
 * confirm input, timed reveal, completion.
 *
 * `interactionStrategy === 'ceremonialConfirm'` (M7) is the one
 * mechanically distinct path: it requires an explicit confirm input while
 * cued rather than auto-engaging on dwell, matching its "one confirm input"
 * design (Part 4) — everything else here is identical across strategies.
 *
 * **Phase 10D.1 removed this component's visual.** It used to draw an
 * untextured `sphereGeometry(0.5)` in greybox grey at the volume's centre —
 * seven of which sat in the finished world, one floating over the marble
 * approach directly below the Taj. The landmark that replaces it is
 * `MemoryLandmarks`, which reads the same store. Every line of state logic
 * below is unchanged: the volume test, the phase transitions, the reveal
 * timing and the door-unlock rule are all gameplay and were not touched.
 *
 * **Phase 10E.1 made it yield to System B.** The decision for one frame now
 * lives in `advanceMemoryVolume`, a pure function, so the ownership rule could
 * be proved rather than asserted. This component keeps the refs, the distance
 * test and the store calls; it makes no decisions of its own.
 */
export function MemoryVolume({ definition }: { definition: MemoryDefinition }) {
  const target = usePlayerTarget();
  const revealElapsed = useRef(0);
  const requiresConfirm = definition.interactionStrategy === 'ceremonialConfirm';

  useFrame((_, delta) => {
    const player = target.current;
    if (!player) return;
    // Dev-only landmark capture holds a forced phase still (see
    // `useLandmarkCaptureStore`). Always false in a production build.
    if (useLandmarkCaptureStore.getState().holdPhases) return;

    const actions = useMemoryStore.getState();
    // M7 belongs to the Taj itself. It must never cue early merely because a
    // player walks near the building; all six garden memories wake it first.
    if (definition.id === 'm7' && !isFinalMemoryUnlocked(actions.completedIds())) return;
    const dx = player.position.x - definition.location.x;
    const dy = player.position.y - definition.location.y;
    const dz = player.position.z - definition.location.z;

    const action = advanceMemoryVolume({
      phase: actions.phases[definition.id],
      inVolume: Math.sqrt(dx * dx + dy * dy + dz * dz) <= definition.discoveryRadius,
      requiresConfirm,
      // Reuses the one ownership model rather than adding a second lock.
      // `interaction` is the resource a dwell volume competes for, and it is
      // what `InteractionInput` and `InteractionPrompt` already gate on; the
      // modal check matches `PlayerController`'s own pairing of the two.
      experienceOwned: ownershipManager.isOwned('interaction') || isExplorationModalOpen(),
      elapsedSeconds: revealElapsed.current,
      deltaSeconds: delta,
      revealDurationSeconds: definition.revealDurationSeconds,
    });

    switch (action.kind) {
      case 'none':
        break;
      case 'cue':
        actions.cue(definition.id);
        break;
      case 'engage':
        actions.engage(definition.id);
        break;
      case 'reveal':
        actions.reveal(definition.id);
        revealElapsed.current = 0;
        break;
      case 'cancel':
        actions.cancel(definition.id);
        revealElapsed.current = 0;
        useMemoryRevealStore.getState().clearRevealing(definition.id);
        break;
      case 'progress':
        revealElapsed.current = action.elapsedSeconds;
        // Presentation only — drives the landmark's radial inlay fill.
        // Read by nothing that saves or gates (see `useMemoryRevealStore`).
        useMemoryRevealStore.getState().setRevealing(definition.id, action.fraction);
        break;
      case 'complete':
        actions.complete(definition.id);
        revealElapsed.current = 0;
        useMemoryRevealStore.getState().clearRevealing(definition.id);
        break;
    }
  });

  return requiresConfirm ? <MemoryConfirmInteraction definition={definition} /> : null;
}

function MemoryConfirmInteraction({ definition }: { definition: MemoryDefinition }) {
  const phase = useMemoryStore((state) => state.phases[definition.id]);
  const finalMemoryUnlocked = useMemoryStore((state) => (
    definition.id !== 'm7' || isFinalMemoryUnlocked(
      Object.entries(state.phases)
        .filter(([, candidatePhase]) => candidatePhase === 'complete')
        .map(([id]) => id as MemoryDefinition['id']),
    )
  ));
  const interaction = useMemo(() => ({
    id: `memory.${definition.id}.confirm`,
    type: 'proximity' as const,
    position: [definition.location.x, definition.location.y, definition.location.z] as const,
    activationDistance: definition.discoveryRadius,
    priority: 100,
    enabled: finalMemoryUnlocked && phase === 'cued',
    behavior: 'repeatable' as const,
    prompt: 'Awaken the Taj memory',
    accessibilityLabel: 'Awaken the seventh memory at the Taj Mahal',
    cooldownMs: 400,
    onActivate: () => {
      if (useMemoryStore.getState().phases[definition.id] === 'cued') useMemoryStore.getState().engage(definition.id);
    },
  }), [definition, finalMemoryUnlocked, phase]);
  useInteractable(interaction);
  return null;
}
