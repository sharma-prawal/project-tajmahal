import { saveManager } from './SaveManager';
import { useExperienceSettingsStore } from '@state/useExperienceSettingsStore';

/** Clears progression and persisted preferences, then reloads at the canonical start. */
export function startFreshExperience(): void {
  saveManager.resetForFreshStart();
  useExperienceSettingsStore.persist.clearStorage();
  const freshUrl = new URL(window.location.href);
  freshUrl.search = '';
  freshUrl.hash = '';
  window.location.replace(freshUrl.toString());
}
