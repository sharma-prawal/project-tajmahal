import { useEffect, useMemo } from 'react';
import { Vector2 } from 'three';
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
import { BOARDING_PASSES_MEMORY } from './boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_ACTIVATION_DISTANCE, FRIDAY_NIGHT_ANCHOR, FRIDAY_NIGHT_INTERACTION_ID, FRIDAY_NIGHT_MEMORY, FRIDAY_NIGHT_MEMORY_ID, FRIDAY_NIGHT_WORLD_ACTION_ID } from './fridayNightMemoryDefinition';
import { useMintsMemoryWorldStore } from './useMintsMemoryWorldStore';
import { useBackMemoryWorldStore } from './useBackMemoryWorldStore';
import { useUmbrellaMemoryWorldStore } from './useUmbrellaMemoryWorldStore';
import { useLittleDetailsMemoryWorldStore } from './useLittleDetailsMemoryWorldStore';
import { useAllDayCallMemoryWorldStore } from './useAllDayCallMemoryWorldStore';
import { useBoardingPassesMemoryWorldStore } from './useBoardingPassesMemoryWorldStore';
import { useFridayNightMemoryWorldStore, type FridayNightStage } from './useFridayNightMemoryWorldStore';
type FridayNightCaptureWindow = typeof window & { __memoryRuntime?: typeof memoryRuntime; __fridayNightCaptureReset?: (reducedMotion: boolean, completed?: boolean) => void };
function parseStage(payload: unknown): FridayNightStage { const stage = payload && typeof payload === 'object' ? (payload as { stage?: unknown }).stage : undefined; if (stage !== 0 && stage !== 1 && stage !== 2 && stage !== 3) throw new Error('Invalid Friday Night world-action stage'); return stage; }

export function FridayNightMemoryRegistration() {
  useEffect(() => {
    const unregisterAction = worldActionRegistry.register(FRIDAY_NIGHT_WORLD_ACTION_ID, ({ payload }) => { const previous = useFridayNightMemoryWorldStore.getState().stage; useFridayNightMemoryWorldStore.getState().setStage(parseStage(payload)); return { undo: () => useFridayNightMemoryWorldStore.getState().setStage(previous) }; });
    validateSourceMemories(SOURCE_MEMORIES, [MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY, ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY]);
    const unregisterMemory = memoryRuntime.registry.register(FRIDAY_NIGHT_MEMORY); useFridayNightMemoryWorldStore.getState().setStage(0);
    if (env.enableDebugTools) {
      (window as FridayNightCaptureWindow).__memoryRuntime = memoryRuntime;
      (window as FridayNightCaptureWindow).__fridayNightCaptureReset = (reducedMotion, completed = false) => {
        memoryRuntime.restore(completed ? [FRIDAY_NIGHT_MEMORY_ID] : [], completed ? ['memory.friday-night.trust-seen'] : [], null); interactionRuntime.restore(completed ? [FRIDAY_NIGHT_INTERACTION_ID] : [], []);
        useMintsMemoryWorldStore.getState().setAcceptedVisible(false); useBackMemoryWorldStore.getState().setReturnActive(false); useUmbrellaMemoryWorldStore.getState().setPathActive(false); useLittleDetailsMemoryWorldStore.getState().setStage(0); useAllDayCallMemoryWorldStore.getState().setStage(0); useBoardingPassesMemoryWorldStore.getState().setStage(0); useFridayNightMemoryWorldStore.getState().setStage(0); useAccessibilityStore.getState().setReducedMotion(reducedMotion);
      };
    }
    return () => { delete (window as FridayNightCaptureWindow).__fridayNightCaptureReset; if (memoryRuntime.getSnapshot().activeMemoryId === FRIDAY_NIGHT_MEMORY_ID) memoryRuntime.cancel('scene-unload'); unregisterMemory(); unregisterAction(); };
  }, []);
  const interaction = useMemo(() => ({ id: FRIDAY_NIGHT_INTERACTION_ID, type: 'view-and-proximity' as const, position: [FRIDAY_NIGHT_ANCHOR[0], FRIDAY_NIGHT_ANCHOR[1] + .5, FRIDAY_NIGHT_ANCHOR[2]] as const, activationDistance: FRIDAY_NIGHT_ACTIVATION_DISTANCE, focusAngleDegrees: 60, priority: 71, behavior: 'repeatable' as const, persistence: 'completion' as const, completion: 'manual' as const, interruption: 'cancel-on-exit' as const, cooldownMs: 900, prompt: 'Remember Family & Blessings', completedPrompt: 'Replay “Family & Blessings”', accessibilityLabel: 'Remember Family & Blessings', completedAccessibilityLabel: 'Replay Family & Blessings', onActivate: (context: InteractionContext) => { if (!memoryRuntime.activate(FRIDAY_NIGHT_MEMORY_ID, context)) context.cancel(); } }), []);
  useInteractable(interaction); return null;
}

export function FridayNightMemoryAnchor() {
  const stage = useFridayNightMemoryWorldStore((state) => state.stage);
  const diyaProfile = useMemo(() => [new Vector2(0, 0), new Vector2(0.28, 0), new Vector2(0.38, 0.12), new Vector2(0.32, 0.22), new Vector2(0, 0.18)], []);
  return <group position={FRIDAY_NIGHT_ANCHOR} name="memory-friday-night-open-enclosure">
    <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
      <latheGeometry args={[diyaProfile, 24]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.22, 0]}>
      <cylinderGeometry args={[0.26, 0.24, 0.04, 20]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.34, 0]}>
      <sphereGeometry args={[0.065, 16, 16]} />
      <meshStandardMaterial color="#fff59d" emissive="#ff6d00" emissiveIntensity={1.6} />
    </mesh>
    <pointLight position={[0, 0.42, 0]} intensity={stage > 0 ? 2.5 : 1.2} color="#ff9100" distance={5} />
  </group>;
}
