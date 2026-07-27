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
import { ALL_DAY_CALL_ACTIVATION_DISTANCE, ALL_DAY_CALL_ANCHOR, ALL_DAY_CALL_INTERACTION_ID, ALL_DAY_CALL_MEMORY, ALL_DAY_CALL_MEMORY_ID, ALL_DAY_CALL_WORLD_ACTION_ID } from './allDayCallMemoryDefinition';
import { BOARDING_PASSES_MEMORY } from './boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from './fridayNightMemoryDefinition';
import { useMintsMemoryWorldStore } from './useMintsMemoryWorldStore';
import { useBackMemoryWorldStore } from './useBackMemoryWorldStore';
import { useUmbrellaMemoryWorldStore } from './useUmbrellaMemoryWorldStore';
import { useLittleDetailsMemoryWorldStore } from './useLittleDetailsMemoryWorldStore';
import { useAllDayCallMemoryWorldStore, type AllDayCallStage } from './useAllDayCallMemoryWorldStore';

type AllDayCallCaptureWindow = typeof window & { __memoryRuntime?: typeof memoryRuntime; __allDayCallCaptureReset?: (reducedMotion: boolean, completed?: boolean) => void };

function parseStage(payload: unknown): AllDayCallStage {
  const stage = payload && typeof payload === 'object' ? (payload as { stage?: unknown }).stage : undefined;
  if (stage !== 0 && stage !== 1 && stage !== 2 && stage !== 3) throw new Error('Invalid All-Day Call world-action stage');
  return stage;
}

export function AllDayCallMemoryRegistration() {
  useEffect(() => {
    const unregisterAction = worldActionRegistry.register(ALL_DAY_CALL_WORLD_ACTION_ID, ({ payload }) => {
      const previous = useAllDayCallMemoryWorldStore.getState().stage;
      useAllDayCallMemoryWorldStore.getState().setStage(parseStage(payload));
      return { undo: () => useAllDayCallMemoryWorldStore.getState().setStage(previous) };
    });
    validateSourceMemories(SOURCE_MEMORIES, [MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY, ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY]);
    const unregisterMemory = memoryRuntime.registry.register(ALL_DAY_CALL_MEMORY);
    useAllDayCallMemoryWorldStore.getState().setStage(0);
    if (env.enableDebugTools) {
      (window as AllDayCallCaptureWindow).__memoryRuntime = memoryRuntime;
      (window as AllDayCallCaptureWindow).__allDayCallCaptureReset = (reducedMotion, completed = false) => {
        memoryRuntime.restore(completed ? [ALL_DAY_CALL_MEMORY_ID] : [], completed ? ['memory.all-day-call.quiet-presence'] : [], null);
        interactionRuntime.restore(completed ? [ALL_DAY_CALL_INTERACTION_ID] : [], []);
        useMintsMemoryWorldStore.getState().setAcceptedVisible(false);
        useBackMemoryWorldStore.getState().setReturnActive(false);
        useUmbrellaMemoryWorldStore.getState().setPathActive(false);
        useLittleDetailsMemoryWorldStore.getState().setStage(0);
        useAllDayCallMemoryWorldStore.getState().setStage(0);
        useAccessibilityStore.getState().setReducedMotion(reducedMotion);
      };
    }
    return () => {
      delete (window as AllDayCallCaptureWindow).__allDayCallCaptureReset;
      if (memoryRuntime.getSnapshot().activeMemoryId === ALL_DAY_CALL_MEMORY_ID) memoryRuntime.cancel('scene-unload');
      unregisterMemory(); unregisterAction();
    };
  }, []);
  const interaction = useMemo(() => ({
    id: ALL_DAY_CALL_INTERACTION_ID, type: 'view-and-proximity' as const, position: [ALL_DAY_CALL_ANCHOR[0], ALL_DAY_CALL_ANCHOR[1] + .5, ALL_DAY_CALL_ANCHOR[2]] as const,
    activationDistance: ALL_DAY_CALL_ACTIVATION_DISTANCE, focusAngleDegrees: 58, priority: 73, behavior: 'repeatable' as const, persistence: 'completion' as const, completion: 'manual' as const, interruption: 'cancel-on-exit' as const, cooldownMs: 900,
    prompt: 'Remember Through Every Emotion', completedPrompt: 'Replay “Through Every Emotion”', accessibilityLabel: 'Remember Through Every Emotion', completedAccessibilityLabel: 'Replay Through Every Emotion',
    onActivate: (context: InteractionContext) => { if (!memoryRuntime.activate(ALL_DAY_CALL_MEMORY_ID, context)) context.cancel(); },
  }), []);
  useInteractable(interaction); return null;
}

export function AllDayCallMemoryAnchor() {
  const stage = useAllDayCallMemoryWorldStore((state) => state.stage);
  return <group position={ALL_DAY_CALL_ANCHOR} name="memory-all-day-call-anchor">
    <mesh position={[-0.14, 0.16, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.14, 0.28, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
    </mesh>
    <mesh position={[-0.14, 0.32, 0]}>
      <sphereGeometry args={[0.04, 12, 12]} />
      <meshStandardMaterial color="#fff3e0" emissive="#ff9800" emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[0.14, 0.16, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.14, 0.28, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
    </mesh>
    <mesh position={[0.14, 0.32, 0]}>
      <sphereGeometry args={[0.04, 12, 12]} />
      <meshStandardMaterial color="#fff3e0" emissive="#ff9800" emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.18, 0.02, 12, 24]} />
      <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={0.9} />
    </mesh>
    {stage > 0 && (
      <pointLight position={[0, 0.4, 0]} intensity={2.0} color="#ffab40" distance={4} />
    )}
  </group>;
}
