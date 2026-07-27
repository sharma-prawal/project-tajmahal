import type { RuntimeMemoryDefinition } from './types';

/**
 * Anchor for the development fixture memory, named like the seven production
 * anchors rather than repeated as a literal in `ReferenceMemory.tsx`. Phase
 * 10F.2 needed it exported so the capture-spawn guard can tell "near a real
 * memory" from "nowhere near anything".
 */
export const REFERENCE_ANCHOR = [18, 1.2, -57] as const;

export const REFERENCE_MEMORY: RuntimeMemoryDefinition = {
  id: 'dev.architectural-study', label: 'Architectural study runtime fixture', triggerInteractionId: 'dev.memory-runtime-marker', contentVersion: 1,
  behavior: 'one-shot', persistence: 'completion', restorePolicy: 'resume-checkpoint', cancellationPolicy: 'allow', accessibilityLabel: 'Placeholder architectural memory', developmentTags: ['phase-7a', 'placeholder'], completionFlags: ['dev.architectural-study.complete'],
  steps: [
    { id: 'acquire-ownership', type: 'acquire', resources: ['interaction', 'traversal', 'narrative-input', 'modal-ui', 'camera'] },
    { id: 'opening-line', type: 'dialogue', speaker: 'Archive note', text: 'Placeholder: observe the proportion of the garden frame.' },
    { id: 'frame-marker', type: 'camera', position: [15, 4.5, -49], target: [18, 1.8, -57], durationMs: 900 },
    { id: 'reveal-guide', type: 'world-action', actionId: 'dev.reveal-architectural-guide', payload: { visible: true } },
    { id: 'safe-return', type: 'checkpoint' },
    { id: 'closing-line', type: 'dialogue', speaker: 'Archive note', text: 'Placeholder: the runtime checkpoint is now valid.' },
    { id: 'complete-memory', type: 'complete' },
  ],
};
