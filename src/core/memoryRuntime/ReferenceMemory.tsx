import { useEffect, useMemo } from 'react';
import { env } from '@config/env';
import { useInteractable } from '@core/interaction/useInteractable';
import { memoryRuntime } from './MemoryRuntime';
import { worldActionRegistry } from './WorldActionRegistry';
import { useReferenceMemoryWorldStore } from './useReferenceMemoryWorldStore';
import type { InteractionContext } from '@core/interaction/types';
import { REFERENCE_ANCHOR, REFERENCE_MEMORY } from './referenceMemoryDefinition';
import { interactionRuntime } from '@core/interaction/InteractionRuntime';
import { useAccessibilityStore } from '@state/useAccessibilityStore';

type MemoryCaptureWindow = typeof window & { __memoryRuntime?: typeof memoryRuntime; __memoryCaptureReset?: (reducedMotion: boolean) => void };

export function ReferenceMemoryRegistration() {
  useEffect(() => {
    if (!env.enableDebugTools) return undefined;
    const unregisterAction = worldActionRegistry.register('dev.reveal-architectural-guide', () => {
      useReferenceMemoryWorldStore.getState().setGuideVisible(true);
      return { undo: () => useReferenceMemoryWorldStore.getState().setGuideVisible(false) };
    });
    const unregisterMemory = memoryRuntime.registry.register(REFERENCE_MEMORY);
    (window as MemoryCaptureWindow).__memoryRuntime = memoryRuntime;
    (window as MemoryCaptureWindow).__memoryCaptureReset = (reducedMotion) => { memoryRuntime.restore([], [], null); interactionRuntime.restore([], []); useAccessibilityStore.getState().setReducedMotion(reducedMotion); };
    memoryRuntime.tryRestoreCheckpoint();
    return () => { delete (window as MemoryCaptureWindow).__memoryRuntime; delete (window as MemoryCaptureWindow).__memoryCaptureReset; if (memoryRuntime.getSnapshot().activeMemoryId === REFERENCE_MEMORY.id) memoryRuntime.cancel('fixture-unload'); unregisterMemory(); unregisterAction(); };
  }, []);
  const interaction = useMemo(() => ({
    id: REFERENCE_MEMORY.triggerInteractionId, type: 'view-and-proximity' as const, position: REFERENCE_ANCHOR, activationDistance: 7, focusAngleDegrees: 60, priority: 50,
    behavior: 'one-shot' as const, persistence: 'completion' as const, completion: 'manual' as const, interruption: 'cancel-on-exit' as const,
    prompt: 'Begin architectural study', accessibilityLabel: 'Begin the placeholder architectural memory',
    onActivate: (context: InteractionContext) => { if (!memoryRuntime.activate(REFERENCE_MEMORY.id, context)) context.cancel(); },
  }), []);
  useInteractable(interaction);
  return null;
}

export function ReferenceMemoryWorldMarker() {
  const visible = useReferenceMemoryWorldStore((state) => state.guideVisible);
  if (!env.enableDebugTools || !visible) return null;
  return <mesh position={[18, 2.2, -57]}><octahedronGeometry args={[0.65, 0]} /><meshStandardMaterial color="#e8c86c" emissive="#c78f2e" emissiveIntensity={1.4} /></mesh>;
}
