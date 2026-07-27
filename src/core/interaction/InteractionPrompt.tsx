import { useDeviceStore } from '@state/useDeviceStore';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { interactionRuntime } from './InteractionRuntime';
import { useInteractionSnapshot } from './useInteractionSnapshot';
import { ownershipManager } from '@core/memoryRuntime/OwnershipManager';
import { clearExplorationInput } from '@core/input/clearExplorationInput';
import { isExplorationModalOpen } from '@state/useExperienceSettingsStore';

export function InteractionPrompt() {
  const snapshot = useInteractionSnapshot();
  const controlScheme = useDeviceStore((state) => state.controlScheme);
  const highContrast = useAccessibilityStore((state) => state.highContrastPrompts);
  if (ownershipManager.isOwned('interaction') || isExplorationModalOpen() || !snapshot.focusedId || snapshot.lifecycle !== 'focused' || !snapshot.prompt) return null;
  return (
    <div className="interaction-prompt-region" aria-live="polite">
      <button
        type="button"
        className={`interaction-prompt${highContrast ? ' interaction-prompt--contrast' : ''}`}
        aria-label={snapshot.accessibilityLabel ?? snapshot.prompt}
        onClick={(event) => {
          if (!interactionRuntime.activate()) return;
          clearExplorationInput();
          event.preventDefault();
          event.stopPropagation();
          event.nativeEvent.stopImmediatePropagation();
        }}
      >
        <span className="interaction-prompt__key" aria-hidden="true">{controlScheme === 'touch' ? 'Tap' : 'E'}</span>
        <span>{snapshot.prompt}</span>
      </button>
    </div>
  );
}
