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
import { UMBRELLA_ANCHOR, UMBRELLA_INTERACTION_ID, UMBRELLA_MEMORY, UMBRELLA_MEMORY_ID, UMBRELLA_WORLD_ACTION_ID } from './umbrellaMemoryDefinition';
import { LITTLE_DETAILS_MEMORY } from './littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_MEMORY } from './allDayCallMemoryDefinition';
import { BOARDING_PASSES_MEMORY } from './boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from './fridayNightMemoryDefinition';
import { useMintsMemoryWorldStore } from './useMintsMemoryWorldStore';
import { useBackMemoryWorldStore } from './useBackMemoryWorldStore';
import { useUmbrellaMemoryWorldStore } from './useUmbrellaMemoryWorldStore';

type UmbrellaCaptureWindow = typeof window & {
  __memoryRuntime?: typeof memoryRuntime;
  __umbrellaCaptureReset?: (reducedMotion: boolean, completed?: boolean) => void;
};

export function UmbrellaMemoryRegistration() {
  useEffect(() => {
    const unregisterAction = worldActionRegistry.register(UMBRELLA_WORLD_ACTION_ID, ({ payload }) => {
      if (!payload || typeof payload !== 'object' || typeof (payload as { active?: unknown }).active !== 'boolean') throw new Error('Invalid Umbrella world-action payload');
      const previous = useUmbrellaMemoryWorldStore.getState().pathActive;
      useUmbrellaMemoryWorldStore.getState().setPathActive((payload as { active: boolean }).active);
      return { undo: () => useUmbrellaMemoryWorldStore.getState().setPathActive(previous) };
    });
    validateSourceMemories(SOURCE_MEMORIES, [MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY, ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY]);
    const unregisterMemory = memoryRuntime.registry.register(UMBRELLA_MEMORY);
    useUmbrellaMemoryWorldStore.getState().setPathActive(false);
    if (env.enableDebugTools) {
      (window as UmbrellaCaptureWindow).__memoryRuntime = memoryRuntime;
      (window as UmbrellaCaptureWindow).__umbrellaCaptureReset = (reducedMotion, completed = false) => {
        memoryRuntime.restore(completed ? [UMBRELLA_MEMORY_ID] : [], completed ? ['memory.umbrella.thoughtful-reminder'] : [], null);
        interactionRuntime.restore(completed ? [UMBRELLA_INTERACTION_ID] : [], []);
        useMintsMemoryWorldStore.getState().setAcceptedVisible(false);
        useBackMemoryWorldStore.getState().setReturnActive(false);
        useUmbrellaMemoryWorldStore.getState().setPathActive(false);
        useAccessibilityStore.getState().setReducedMotion(reducedMotion);
      };
    }
    return () => {
      delete (window as UmbrellaCaptureWindow).__umbrellaCaptureReset;
      if (memoryRuntime.getSnapshot().activeMemoryId === UMBRELLA_MEMORY_ID) memoryRuntime.cancel('scene-unload');
      unregisterMemory(); unregisterAction();
    };
  }, []);
  const interaction = useMemo(() => ({
    id: UMBRELLA_INTERACTION_ID,
    type: 'view-and-proximity' as const,
    position: [UMBRELLA_ANCHOR[0], 1.4, UMBRELLA_ANCHOR[2]] as const,
    activationDistance: 6.5,
    focusAngleDegrees: 62,
    priority: 75,
    behavior: 'repeatable' as const,
    persistence: 'completion' as const,
    completion: 'manual' as const,
    interruption: 'cancel-on-exit' as const,
    cooldownMs: 900,
    prompt: 'Remember Fried Rice & Love',
    completedPrompt: 'Replay “Fried Rice & Love”',
    accessibilityLabel: 'Remember Fried Rice & Love',
    completedAccessibilityLabel: 'Replay Fried Rice & Love',
    onActivate: (context: InteractionContext) => { if (!memoryRuntime.activate(UMBRELLA_MEMORY_ID, context)) context.cancel(); },
  }), []);
  useInteractable(interaction);
  return null;
}

export function UmbrellaMemoryAnchor() {
  const pathActive = useUmbrellaMemoryWorldStore((state) => state.pathActive);
  return <group position={UMBRELLA_ANCHOR} name="memory-umbrella-anchor">
    <mesh position={[0, 0.04, 0]} receiveShadow>
      <cylinderGeometry args={[0.45, 0.48, 0.05, 24]} />
      <meshStandardMaterial color="#8c6a36" roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.22, 0]} castShadow>
      <cylinderGeometry args={[0.32, 0.16, 0.22, 24]} />
      <meshStandardMaterial color="#212529" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.29, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
      <meshStandardMaterial color="#f4c430" roughness={0.8} />
    </mesh>
    <mesh position={[0.1, 0.38, 0.05]} rotation={[0.2, 0.4, -0.15]}>
      <cylinderGeometry args={[0.008, 0.004, 0.48, 8]} />
      <meshStandardMaterial color="#5c3a21" roughness={0.4} />
    </mesh>
    <mesh position={[0.14, 0.39, 0.07]} rotation={[0.22, 0.42, -0.12]}>
      <cylinderGeometry args={[0.008, 0.004, 0.48, 8]} />
      <meshStandardMaterial color="#5c3a21" roughness={0.4} />
    </mesh>
    {pathActive && (
      <pointLight position={[0, 0.45, 0]} intensity={1.6} color="#ffa726" distance={3.5} />
    )}
  </group>;
}
