import { useEffect, useMemo } from 'react';
import { Vector2 } from 'three';
import { useInteractable } from '@core/interaction/useInteractable';
import type { InteractionContext } from '@core/interaction/types';
import { SOURCE_MEMORIES } from '@/content/memories/sourceMemories';
import { validateSourceMemories } from '@/content/memories/validation';
import { memoryRuntime } from './MemoryRuntime';
import { worldActionRegistry } from './WorldActionRegistry';
import { MINTS_ACTIVATION_DISTANCE, MINTS_ANCHOR, MINTS_INTERACTION_ID, MINTS_MEMORY, MINTS_MEMORY_ID, MINTS_WORLD_ACTION_ID } from './mintsMemoryDefinition';
import { BACK_MEMORY } from './backMemoryDefinition';
import { UMBRELLA_MEMORY } from './umbrellaMemoryDefinition';
import { LITTLE_DETAILS_MEMORY } from './littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_MEMORY } from './allDayCallMemoryDefinition';
import { BOARDING_PASSES_MEMORY } from './boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY } from './fridayNightMemoryDefinition';
import { useMintsMemoryWorldStore } from './useMintsMemoryWorldStore';
import { env } from '@config/env';
import { interactionRuntime } from '@core/interaction/InteractionRuntime';
import { useAccessibilityStore } from '@state/useAccessibilityStore';

type MintsCaptureWindow = typeof window & { __memoryRuntime?: typeof memoryRuntime; __mintsCaptureReset?: (reducedMotion: boolean) => void };

export function MintsMemoryRegistration() {
  useEffect(() => {
    const unregisterAction = worldActionRegistry.register(MINTS_WORLD_ACTION_ID, ({ payload }) => {
      if (!payload || typeof payload !== 'object' || (payload as { visible?: unknown }).visible !== true) throw new Error('Invalid mints world-action payload');
      useMintsMemoryWorldStore.getState().setAcceptedVisible(true);
      return { undo: () => useMintsMemoryWorldStore.getState().setAcceptedVisible(false) };
    });
    validateSourceMemories(SOURCE_MEMORIES, [MINTS_MEMORY, BACK_MEMORY, UMBRELLA_MEMORY, LITTLE_DETAILS_MEMORY, ALL_DAY_CALL_MEMORY, BOARDING_PASSES_MEMORY, FRIDAY_NIGHT_MEMORY]);
    const unregisterMemory = memoryRuntime.registry.register(MINTS_MEMORY);
    useMintsMemoryWorldStore.getState().setAcceptedVisible(memoryRuntime.getFlags().includes('memory.mints.accepted'));
    if (env.enableDebugTools) {
      (window as MintsCaptureWindow).__memoryRuntime = memoryRuntime;
      (window as MintsCaptureWindow).__mintsCaptureReset = (reducedMotion) => { memoryRuntime.restore([], [], null); interactionRuntime.restore([], []); useMintsMemoryWorldStore.getState().setAcceptedVisible(false); useAccessibilityStore.getState().setReducedMotion(reducedMotion); };
    }
    return () => { delete (window as MintsCaptureWindow).__memoryRuntime; delete (window as MintsCaptureWindow).__mintsCaptureReset; if (memoryRuntime.getSnapshot().activeMemoryId === MINTS_MEMORY_ID) memoryRuntime.cancel('scene-unload'); unregisterMemory(); unregisterAction(); };
  }, []);
  const interaction = useMemo(() => ({
    id: MINTS_INTERACTION_ID, type: 'view-and-proximity' as const, position: [MINTS_ANCHOR[0], MINTS_ANCHOR[1] + 0.55, MINTS_ANCHOR[2]] as const,
    activationDistance: MINTS_ACTIVATION_DISTANCE, focusAngleDegrees: 58, priority: 80, behavior: 'repeatable' as const, persistence: 'completion' as const,
    completion: 'manual' as const, interruption: 'cancel-on-exit' as const, cooldownMs: 900, prompt: 'Remember Warmth in Absence', completedPrompt: 'Replay “Warmth in Absence”', accessibilityLabel: 'Remember Warmth in Absence', completedAccessibilityLabel: 'Replay Warmth in Absence',
    onActivate: (context: InteractionContext) => { if (!memoryRuntime.activate(MINTS_MEMORY_ID, context)) context.cancel(); },
  }), []);
  useInteractable(interaction);
  return null;
}

export function MintsMemoryAnchor() {
  const acceptedVisible = useMintsMemoryWorldStore((state) => state.acceptedVisible);
  const dishProfile = useMemo(() => [new Vector2(0, 0), new Vector2(.36, 0), new Vector2(.44, .12), new Vector2(.38, .24), new Vector2(.12, .26), new Vector2(0, .22)], []);
  return <group position={MINTS_ANCHOR} name="memory-mints-anchor">
    <mesh position={[0, 0.1, 0]} receiveShadow={false}>
      <latheGeometry args={[dishProfile, 24]} />
      <meshStandardMaterial color="#98753c" roughness={0.32} metalness={0.65} />
    </mesh>
    <mesh position={[0, 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.25, 0.32, 20]} />
      <meshStandardMaterial color="#d4af37" roughness={0.28} metalness={0.75} />
    </mesh>
    <mesh position={[0, 0.54, 0]} castShadow>
      <sphereGeometry args={[0.29, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
      <meshStandardMaterial color="#b5902a" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.65, 0]}>
      <sphereGeometry args={[0.045, 12, 12]} />
      <meshStandardMaterial color="#e6ca65" roughness={0.2} metalness={0.9} />
    </mesh>
    {acceptedVisible && (
      <pointLight position={[0, 0.7, 0]} intensity={1.5} color="#ffb74d" distance={3} />
    )}
  </group>;
}
