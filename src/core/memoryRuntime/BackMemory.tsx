import { useEffect, useMemo } from 'react';
import type { InteractionContext } from '@core/interaction/types';
import { useInteractable } from '@core/interaction/useInteractable';
import { interactionRuntime } from '@core/interaction/InteractionRuntime';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { env } from '@config/env';
import { SOURCE_MEMORIES } from '@/content/memories/sourceMemories';
import { validateSourceMemories } from '@/content/memories/validation';
import { memoryRuntime } from './MemoryRuntime';
import { worldActionRegistry } from './WorldActionRegistry';
import { MINTS_MEMORY } from './mintsMemoryDefinition';
import { BACK_ANCHOR, BACK_INTERACTION_ID, BACK_MEMORY, BACK_MEMORY_ID, BACK_WORLD_ACTION_ID } from './backMemoryDefinition';
import { UMBRELLA_MEMORY } from './umbrellaMemoryDefinition';
import { LITTLE_DETAILS_MEMORY } from './littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_MEMORY } from './allDayCallMemoryDefinition';
import { BOARDING_PASSES_MEMORY } from './boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from './fridayNightMemoryDefinition';
import { useBackMemoryWorldStore } from './useBackMemoryWorldStore';
import { useMintsMemoryWorldStore } from './useMintsMemoryWorldStore';

type BackCaptureWindow = typeof window & {
  __memoryRuntime?: typeof memoryRuntime;
  __backCaptureReset?: (reducedMotion: boolean, completed?: boolean) => void;
};

export function BackMemoryRegistration() {
  useEffect(() => {
    const unregisterAction = worldActionRegistry.register(BACK_WORLD_ACTION_ID, ({ payload }) => {
      if (!payload || typeof payload !== 'object' || typeof (payload as { active?: unknown }).active !== 'boolean') throw new Error('Invalid Back world-action payload');
      const previous = useBackMemoryWorldStore.getState().returnActive;
      useBackMemoryWorldStore.getState().setReturnActive((payload as { active: boolean }).active);
      return { undo: () => useBackMemoryWorldStore.getState().setReturnActive(previous) };
    });
    validateSourceMemories(SOURCE_MEMORIES, [MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY, ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY]);
    const unregisterMemory = memoryRuntime.registry.register(BACK_MEMORY);
    useBackMemoryWorldStore.getState().setReturnActive(false);
    if (env.enableDebugTools) {
      (window as BackCaptureWindow).__memoryRuntime = memoryRuntime;
      (window as BackCaptureWindow).__backCaptureReset = (reducedMotion, completed = false) => {
        const runtimeCompleted = completed ? [BACK_MEMORY_ID] : [];
        const flags = completed ? ['memory.back.returned'] : [];
        const interactionCompleted = completed ? [BACK_INTERACTION_ID] : [];
        memoryRuntime.restore(runtimeCompleted, flags, null);
        interactionRuntime.restore(interactionCompleted, []);
        useBackMemoryWorldStore.getState().setReturnActive(false);
        useMintsMemoryWorldStore.getState().setAcceptedVisible(false);
        useAccessibilityStore.getState().setReducedMotion(reducedMotion);
      };
    }
    return () => {
      delete (window as BackCaptureWindow).__backCaptureReset;
      if (memoryRuntime.getSnapshot().activeMemoryId === BACK_MEMORY_ID) memoryRuntime.cancel('scene-unload');
      unregisterMemory();
      unregisterAction();
    };
  }, []);
  const interaction = useMemo(() => ({
    id: BACK_INTERACTION_ID,
    type: 'view-and-proximity' as const,
    position: [BACK_ANCHOR[0], 1.6, BACK_ANCHOR[2]] as const,
    activationDistance: 6.5,
    focusAngleDegrees: 62,
    priority: 76,
    behavior: 'repeatable' as const,
    persistence: 'completion' as const,
    completion: 'manual' as const,
    interruption: 'cancel-on-exit' as const,
    cooldownMs: 900,
    prompt: 'Remember A Touch of Sanity',
    completedPrompt: 'Replay “A Touch of Sanity”',
    accessibilityLabel: 'Remember A Touch of Sanity',
    completedAccessibilityLabel: 'Replay A Touch of Sanity',
    onActivate: (context: InteractionContext) => { if (!memoryRuntime.activate(BACK_MEMORY_ID, context)) context.cancel(); },
  }), []);
  useInteractable(interaction);
  return null;
}

export function ProductionMemoryRestoration() {
  useEffect(() => {
    const checkpoint = memoryRuntime.getCheckpoint();
    const definition = checkpoint ? memoryRuntime.registry.get(checkpoint.memoryId) : undefined;
    memoryRuntime.tryRestoreCheckpoint(definition ? {
      complete: () => interactionRuntime.completeRestored(definition.triggerInteractionId),
      cancel: () => true,
    } : undefined);
  }, []);
  return null;
}

export function BackMemoryAnchor() {
  const returnActive = useBackMemoryWorldStore((state) => state.returnActive);
  return <group position={BACK_ANCHOR} name="memory-back-anchor">
    <mesh position={[0, 0.08, 0]} receiveShadow>
      <boxGeometry args={[0.65, 0.12, 0.45]} />
      <meshStandardMaterial color="#5c3a21" roughness={0.4} metalness={0.1} />
    </mesh>
    <mesh position={[-0.15, 0.22, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.12, 0.18, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.8} />
    </mesh>
    <mesh position={[0.15, 0.24, 0]} castShadow>
      <sphereGeometry args={[0.11, 20, 20]} />
      <meshStandardMaterial color="#f0e6d2" emissive="#e6aa4e" emissiveIntensity={returnActive ? 0.9 : 0.2} roughness={0.3} />
    </mesh>
    {returnActive && (
      <pointLight position={[0.15, 0.35, 0]} intensity={1.8} color="#ffb300" distance={3.5} />
    )}
  </group>;
}
