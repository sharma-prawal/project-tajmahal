import { useEffect, useMemo } from 'react';
import type { InteractionContext } from '@core/interaction/types';
import { interactionRuntime } from '@core/interaction/InteractionRuntime';
import { useInteractable } from '@core/interaction/useInteractable';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { env } from '@config/env';
import { SOURCE_MEMORIES } from '@/content/memories/sourceMemories';
import { validateSourceMemories } from '@/content/memories/validation';
import { memoryRuntime } from './MemoryRuntime';
import { worldActionRegistry } from './WorldActionRegistry';
import { MINTS_MEMORY } from './mintsMemoryDefinition';
import { BACK_MEMORY } from './backMemoryDefinition';
import { UMBRELLA_MEMORY } from './umbrellaMemoryDefinition';
import { LITTLE_DETAILS_ACTIVATION_DISTANCE, LITTLE_DETAILS_ANCHOR, LITTLE_DETAILS_INTERACTION_ID, LITTLE_DETAILS_MEMORY, LITTLE_DETAILS_MEMORY_ID, LITTLE_DETAILS_WORLD_ACTION_ID } from './littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_MEMORY } from './allDayCallMemoryDefinition';
import { BOARDING_PASSES_MEMORY } from './boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from './fridayNightMemoryDefinition';
import { useMintsMemoryWorldStore } from './useMintsMemoryWorldStore';
import { useBackMemoryWorldStore } from './useBackMemoryWorldStore';
import { useUmbrellaMemoryWorldStore } from './useUmbrellaMemoryWorldStore';
import { useLittleDetailsMemoryWorldStore, type LittleDetailsStage } from './useLittleDetailsMemoryWorldStore';

type LittleDetailsCaptureWindow = typeof window & { __memoryRuntime?: typeof memoryRuntime; __littleDetailsCaptureReset?: (reducedMotion: boolean, completed?: boolean) => void };

function parseStage(payload: unknown): LittleDetailsStage {
  const stage = payload && typeof payload === 'object' ? (payload as { stage?: unknown }).stage : undefined;
  if (stage !== 0 && stage !== 1 && stage !== 2 && stage !== 3) throw new Error('Invalid Little Details world-action stage');
  return stage;
}

export function LittleDetailsMemoryRegistration() {
  useEffect(() => {
    const unregisterAction = worldActionRegistry.register(LITTLE_DETAILS_WORLD_ACTION_ID, ({ payload }) => {
      const previous = useLittleDetailsMemoryWorldStore.getState().stage; useLittleDetailsMemoryWorldStore.getState().setStage(parseStage(payload));
      return { undo: () => useLittleDetailsMemoryWorldStore.getState().setStage(previous) };
    });
    validateSourceMemories(SOURCE_MEMORIES, [MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY, ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY]);
    const unregisterMemory = memoryRuntime.registry.register(LITTLE_DETAILS_MEMORY); useLittleDetailsMemoryWorldStore.getState().setStage(0);
    if (env.enableDebugTools) {
      (window as LittleDetailsCaptureWindow).__memoryRuntime = memoryRuntime;
      (window as LittleDetailsCaptureWindow).__littleDetailsCaptureReset = (reducedMotion, completed = false) => {
        memoryRuntime.restore(completed ? [LITTLE_DETAILS_MEMORY_ID] : [], completed ? ['memory.little-details.effortless-trust'] : [], null);
        interactionRuntime.restore(completed ? [LITTLE_DETAILS_INTERACTION_ID] : [], []);
        useMintsMemoryWorldStore.getState().setAcceptedVisible(false); useBackMemoryWorldStore.getState().setReturnActive(false); useUmbrellaMemoryWorldStore.getState().setPathActive(false); useLittleDetailsMemoryWorldStore.getState().setStage(0); useAccessibilityStore.getState().setReducedMotion(reducedMotion);
      };
    }
    return () => { delete (window as LittleDetailsCaptureWindow).__littleDetailsCaptureReset; if (memoryRuntime.getSnapshot().activeMemoryId === LITTLE_DETAILS_MEMORY_ID) memoryRuntime.cancel('scene-unload'); unregisterMemory(); unregisterAction(); };
  }, []);
  const interaction = useMemo(() => ({
    id: LITTLE_DETAILS_INTERACTION_ID, type: 'view-and-proximity' as const, position: [LITTLE_DETAILS_ANCHOR[0], LITTLE_DETAILS_ANCHOR[1] + .5, LITTLE_DETAILS_ANCHOR[2]] as const,
    activationDistance: LITTLE_DETAILS_ACTIVATION_DISTANCE, focusAngleDegrees: 60, priority: 74, behavior: 'repeatable' as const, persistence: 'completion' as const, completion: 'manual' as const, interruption: 'cancel-on-exit' as const, cooldownMs: 900,
    prompt: 'Remember The Careless Days', completedPrompt: 'Replay “The Careless Days”', accessibilityLabel: 'Remember The Careless Days', completedAccessibilityLabel: 'Replay The Careless Days',
    onActivate: (context: InteractionContext) => { if (!memoryRuntime.activate(LITTLE_DETAILS_MEMORY_ID, context)) context.cancel(); },
  }), []);
  useInteractable(interaction); return null;
}

export function LittleDetailsMemoryAnchor() {
  const stage = useLittleDetailsMemoryWorldStore((state) => state.stage);
  return <group position={LITTLE_DETAILS_ANCHOR} name="memory-little-details-anchor">
    <mesh position={[0, 0.06, 0]} receiveShadow>
      <boxGeometry args={[0.75, 0.1, 0.5]} />
      <meshStandardMaterial color="#4a2e1b" roughness={0.4} />
    </mesh>
    <mesh position={[-0.18, 0.15, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.14, 0.08, 16]} />
      <meshStandardMaterial color="#ffffff" roughness={0.6} />
    </mesh>
    <mesh position={[0.02, 0.14, -0.05]} rotation={[0, 0.2, 0]} castShadow>
      <boxGeometry args={[0.08, 0.06, 0.28]} />
      <meshStandardMaterial color="#1a365d" roughness={0.3} />
    </mesh>
    <mesh position={[0.2, 0.14, 0.05]} rotation={[0.1, -0.3, 0]} castShadow>
      <capsuleGeometry args={[0.04, 0.18, 8, 16]} />
      <meshStandardMaterial color="#e53e3e" roughness={0.8} />
    </mesh>
    {stage > 0 && (
      <pointLight position={[0, 0.35, 0]} intensity={1.5} color="#63b3ed" distance={3.5} />
    )}
  </group>;
}
