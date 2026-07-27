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
import { LITTLE_DETAILS_MEMORY } from './littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_MEMORY } from './allDayCallMemoryDefinition';
import { BOARDING_PASSES_ACTIVATION_DISTANCE, BOARDING_PASSES_ANCHOR, BOARDING_PASSES_INTERACTION_ID, BOARDING_PASSES_MEMORY, BOARDING_PASSES_MEMORY_ID, BOARDING_PASSES_WORLD_ACTION_ID } from './boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from './fridayNightMemoryDefinition';
import { useMintsMemoryWorldStore } from './useMintsMemoryWorldStore';
import { useBackMemoryWorldStore } from './useBackMemoryWorldStore';
import { useUmbrellaMemoryWorldStore } from './useUmbrellaMemoryWorldStore';
import { useLittleDetailsMemoryWorldStore } from './useLittleDetailsMemoryWorldStore';
import { useAllDayCallMemoryWorldStore } from './useAllDayCallMemoryWorldStore';
import { useBoardingPassesMemoryWorldStore, type BoardingPassesStage } from './useBoardingPassesMemoryWorldStore';
type BoardingPassesCaptureWindow = typeof window & { __memoryRuntime?: typeof memoryRuntime; __boardingPassesCaptureReset?: (reducedMotion: boolean, completed?: boolean) => void };

function parseStage(payload: unknown): BoardingPassesStage {
  const stage = payload && typeof payload === 'object' ? (payload as { stage?: unknown }).stage : undefined;
  if (stage !== 0 && stage !== 1 && stage !== 2 && stage !== 3) throw new Error('Invalid Boarding Passes world-action stage');
  return stage;
}

export function BoardingPassesMemoryRegistration() {
  useEffect(() => {
    const unregisterAction = worldActionRegistry.register(BOARDING_PASSES_WORLD_ACTION_ID, ({ payload }) => {
      const previous = useBoardingPassesMemoryWorldStore.getState().stage;
      useBoardingPassesMemoryWorldStore.getState().setStage(parseStage(payload));
      return { undo: () => useBoardingPassesMemoryWorldStore.getState().setStage(previous) };
    });
    validateSourceMemories(SOURCE_MEMORIES, [MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY, ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY]);
    const unregisterMemory = memoryRuntime.registry.register(BOARDING_PASSES_MEMORY);
    useBoardingPassesMemoryWorldStore.getState().setStage(0);
    if (env.enableDebugTools) {
      (window as BoardingPassesCaptureWindow).__memoryRuntime = memoryRuntime;
      (window as BoardingPassesCaptureWindow).__boardingPassesCaptureReset = (reducedMotion, completed = false) => {
        memoryRuntime.restore(completed ? [BOARDING_PASSES_MEMORY_ID] : [], completed ? ['memory.boarding-passes.shared-effort'] : [], null);
        interactionRuntime.restore(completed ? [BOARDING_PASSES_INTERACTION_ID] : [], []);
        useMintsMemoryWorldStore.getState().setAcceptedVisible(false);
        useBackMemoryWorldStore.getState().setReturnActive(false);
        useUmbrellaMemoryWorldStore.getState().setPathActive(false);
        useLittleDetailsMemoryWorldStore.getState().setStage(0);
        useAllDayCallMemoryWorldStore.getState().setStage(0);
        useBoardingPassesMemoryWorldStore.getState().setStage(0);
        useAccessibilityStore.getState().setReducedMotion(reducedMotion);
      };
    }
    return () => {
      delete (window as BoardingPassesCaptureWindow).__boardingPassesCaptureReset;
      if (memoryRuntime.getSnapshot().activeMemoryId === BOARDING_PASSES_MEMORY_ID) memoryRuntime.cancel('scene-unload');
      unregisterMemory(); unregisterAction();
    };
  }, []);
  const interaction = useMemo(() => ({
    id: BOARDING_PASSES_INTERACTION_ID, type: 'view-and-proximity' as const, position: [BOARDING_PASSES_ANCHOR[0], BOARDING_PASSES_ANCHOR[1] + .5, BOARDING_PASSES_ANCHOR[2]] as const,
    activationDistance: BOARDING_PASSES_ACTIVATION_DISTANCE, focusAngleDegrees: 58, priority: 72, behavior: 'repeatable' as const, persistence: 'completion' as const, completion: 'manual' as const, interruption: 'cancel-on-exit' as const, cooldownMs: 900,
    prompt: 'Remember The Birthday Gift', completedPrompt: 'Replay “The Birthday Gift”', accessibilityLabel: 'Remember The Birthday Gift', completedAccessibilityLabel: 'Replay The Birthday Gift',
    onActivate: (context: InteractionContext) => { if (!memoryRuntime.activate(BOARDING_PASSES_MEMORY_ID, context)) context.cancel(); },
  }), []);
  useInteractable(interaction); return null;
}

export function BoardingPassesMemoryAnchor() {
  const stage = useBoardingPassesMemoryWorldStore((state) => state.stage);
  return <group position={BOARDING_PASSES_ANCHOR} name="memory-boarding-passes-collaboration-grid">
    <mesh position={[0, 0.08, 0]} receiveShadow>
      <boxGeometry args={[0.8, 0.12, 0.45]} />
      <meshStandardMaterial color="#2d3238" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.28, 0]} castShadow>
      <boxGeometry args={[0.38, 0.22, 0.02]} />
      <meshStandardMaterial color="#0c1017" emissive="#1976d2" emissiveIntensity={stage > 0 ? 0.8 : 0.2} roughness={0.1} />
    </mesh>
    <mesh position={[-0.24, 0.28, 0]} castShadow>
      <capsuleGeometry args={[0.045, 0.16, 8, 16]} />
      <meshStandardMaterial color="#f0f2f5" roughness={0.2} metalness={0.1} />
    </mesh>
    <mesh position={[0.24, 0.28, 0]} castShadow>
      <capsuleGeometry args={[0.045, 0.16, 8, 16]} />
      <meshStandardMaterial color="#f0f2f5" roughness={0.2} metalness={0.1} />
    </mesh>
    <mesh position={[-0.22, 0.3, 0.035]}>
      <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
      <meshStandardMaterial color="#1f2328" />
    </mesh>
    <mesh position={[0.22, 0.25, 0.035]}>
      <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
      <meshStandardMaterial color="#1f2328" />
    </mesh>
    {stage > 0 && (
      <pointLight position={[0, 0.4, 0.1]} intensity={1.5} color="#42a5f5" distance={3.5} />
    )}
  </group>;
}
