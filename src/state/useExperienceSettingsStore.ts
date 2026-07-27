import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearExplorationInput } from '@core/input/clearExplorationInput';

export type QualityPreference = 'auto' | 'high' | 'balanced' | 'performance';
export type PanoramaView = 'gate-to-taj' | 'taj-to-gate';
export type CameraPerspective = 'third-person' | 'first-person';

interface ExperienceSettingsState {
  cameraSensitivity: number;
  invertCameraY: boolean;
  movementSpeed: number;
  quality: QualityPreference;
  shadows: boolean;
  interfaceScale: number;
  audioMasterVolume: number;
  audioAmbienceVolume: number;
  audioEffectsVolume: number;
  audioNarrationVolume: number;
  tutorialDismissed: boolean;
  cameraPerspective: CameraPerspective;
  settingsOpen: boolean;
  onboardingOpen: boolean;
  welcomeOpen: boolean;
  journalOpen: boolean;
  panoramaOpen: boolean;
  panoramaView: PanoramaView;
  set: (values: Partial<Omit<ExperienceSettingsState, 'set' | 'reset'>>) => void;
  openSettings: () => void;
  closeSettings: () => void;
  replayTutorial: () => void;
  dismissTutorial: () => void;
  completeTutorial: () => void;
  dismissWelcome: () => void;
  openJournal: () => void;
  closeJournal: () => void;
  openPanorama: (view?: PanoramaView) => void;
  setPanoramaView: (view: PanoramaView) => void;
  closePanorama: () => void;
  reset: () => void;
}

export const EXPERIENCE_SETTINGS_DEFAULTS = {
  cameraSensitivity: 1,
  invertCameraY: false,
  movementSpeed: 1,
  quality: 'auto' as QualityPreference,
  shadows: true,
  interfaceScale: 1,
  audioMasterVolume: 0.72,
  audioAmbienceVolume: 0.42,
  audioEffectsVolume: 0.64,
  audioNarrationVolume: 0.86,
  tutorialDismissed: false,
  cameraPerspective: 'third-person' as CameraPerspective,
};

export const useExperienceSettingsStore = create<ExperienceSettingsState>()(persist((set) => ({
  ...EXPERIENCE_SETTINGS_DEFAULTS,
  settingsOpen: false,
  onboardingOpen: false,
  welcomeOpen: false,
  journalOpen: false,
  panoramaOpen: false,
  panoramaView: 'gate-to-taj' as PanoramaView,
  set: (values) => set(values),
  openSettings: () => { clearExplorationInput(); set({ settingsOpen: true, onboardingOpen: false, welcomeOpen: false, journalOpen: false }); },
  closeSettings: () => set({ settingsOpen: false }),
  replayTutorial: () => { clearExplorationInput(); set({ settingsOpen: false, onboardingOpen: true, welcomeOpen: false }); },
  dismissTutorial: () => set({ tutorialDismissed: true, onboardingOpen: false }),
  completeTutorial: () => set({ tutorialDismissed: true, onboardingOpen: false, welcomeOpen: true }),
  dismissWelcome: () => set({ welcomeOpen: false }),
  openJournal: () => { clearExplorationInput(); set({ settingsOpen: false, onboardingOpen: false, welcomeOpen: false, journalOpen: true }); },
  closeJournal: () => set({ journalOpen: false }),
  openPanorama: (view = 'gate-to-taj') => { clearExplorationInput(); set({ settingsOpen: false, onboardingOpen: false, welcomeOpen: false, journalOpen: false, panoramaOpen: true, panoramaView: view }); },
  setPanoramaView: (view) => set({ panoramaView: view }),
  closePanorama: () => set({ panoramaOpen: false }),
  reset: () => set((state) => ({ ...EXPERIENCE_SETTINGS_DEFAULTS, settingsOpen: state.settingsOpen, onboardingOpen: false, welcomeOpen: false, journalOpen: false, panoramaOpen: false, panoramaView: 'gate-to-taj' })),
}), {
  name: 'project-taj:experience-settings',
  partialize: ({ cameraSensitivity, invertCameraY, movementSpeed, quality, shadows, interfaceScale, audioMasterVolume, audioAmbienceVolume, audioEffectsVolume, audioNarrationVolume, tutorialDismissed, cameraPerspective }) => ({ cameraSensitivity, invertCameraY, movementSpeed, quality, shadows, interfaceScale, audioMasterVolume, audioAmbienceVolume, audioEffectsVolume, audioNarrationVolume, tutorialDismissed, cameraPerspective }),
}));

export function isExplorationModalOpen(): boolean {
  const state = useExperienceSettingsStore.getState();
  return state.settingsOpen || state.onboardingOpen || state.welcomeOpen || state.journalOpen || state.panoramaOpen;
}
