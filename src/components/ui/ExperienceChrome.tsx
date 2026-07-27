import { useCallback, useEffect, useState } from 'react';
import { env } from '@config/env';
import { useCameraState } from '@core/camera/CameraStateContext';
import { ownershipManager } from '@core/memoryRuntime/OwnershipManager';
import { MOUSE_LOOK } from '@constants/movement';
import { EXPLORATION_CAMERA } from '@constants/scene';
import { clamp } from '@utils/math';
import { useDeviceStore } from '@state/useDeviceStore';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { isExplorationModalOpen, useExperienceSettingsStore } from '@state/useExperienceSettingsStore';
import { audioManager } from '@core/audio/AudioManager';
import { NARRATION_ASSETS } from '@core/audio/audioAssets';
import { startFreshExperience } from '@core/save/startFreshExperience';
import { interactionRuntime } from '@core/interaction/InteractionRuntime';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { MemoriesJournal } from './MemoriesJournal';

const ORBIT_STEP = 0.16;
const PITCH_STEP = 0.11;
const WELCOME_LINES = [
  ['Welcome, Aashna', 'Hello, Aashna—and welcome to a little piece of Agra, made especially for you.'],
  ['A Taj of your own', 'Just as the Taj Mahal was created as a timeless symbol of love, I wanted to build something virtual and truly special for you, bringing it to life here in a world of your own.'],
  ['Wander freely', 'Walk through the Charbagh, follow the fountains, look up at the minarets, and take in the mausoleum at your own pace.'],
  ['Look for the memories', 'A few of our memories are hidden across the gardens, waiting to be unlocked before you climb the Taj’s stairs. Explore every path, look closely, and take your time. This place was made for you.'],
] as const;
function cameraAvailable() { return !ownershipManager.isOwned('camera') && !isExplorationModalOpen(); }

export function ExperienceChrome() {
  const orbit = useCameraState();
  const controlScheme = useDeviceStore((state) => state.controlScheme);
  const settings = useExperienceSettingsStore();
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const setReducedMotion = useAccessibilityStore((state) => state.setReducedMotion);
  const audioMuted = useAccessibilityStore((state) => state.audioMuted);
  const setAudioMuted = useAccessibilityStore((state) => state.setAudioMuted);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialStarted, setTutorialStarted] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState(0);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));

  const settleCameraButton = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
  };
  const resetCamera = () => { if (!cameraAvailable()) return; orbit.current.yaw = 0; orbit.current.pitch = 0; orbit.current.distance = EXPLORATION_CAMERA.distance; };
  const orbitBy = (yaw: number, pitch: number) => { if (!cameraAvailable()) return; orbit.current.yaw += yaw; orbit.current.pitch = clamp(orbit.current.pitch + pitch, MOUSE_LOOK.pitchMin, MOUSE_LOOK.pitchMax); };
  const startFresh = () => {
    if (window.confirm('Start from the beginning? This clears all memories, position, tutorial state, and settings.')) startFreshExperience();
  };
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };
  const openPanorama = (view?: 'gate-to-taj' | 'taj-to-gate') => {
    interactionRuntime.cancel();
    memoryRuntime.cancel('user-cancelled');
    settings.openPanorama(view);
  };

  useEffect(() => {
    if (!env.enableDebugTools && !useExperienceSettingsStore.getState().tutorialDismissed) useExperienceSettingsStore.getState().set({ onboardingOpen: true });
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(settings.interfaceScale));
  }, [settings.interfaceScale]);
  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && useExperienceSettingsStore.getState().settingsOpen) { settings.closeSettings(); return; }
      if (event.code === 'Escape' && useExperienceSettingsStore.getState().journalOpen) { settings.closeJournal(); return; }
      if (event.code === 'Escape' && useExperienceSettingsStore.getState().panoramaOpen) { settings.closePanorama(); return; }
      if (event.code === 'KeyC' && !event.repeat && !isExplorationModalOpen()) resetCamera();
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });

  const tutorial = controlScheme === 'touch' ? [
    ['Move naturally', 'Drag within the left control ring to walk in any direction.'],
    ['Look around', 'Drag the open right side of the scene to rotate the camera.'],
    ['Remember', 'Tap a memory prompt, then use Continue to move through each reflection.'],
  ] : [
    ['Move naturally', 'Use W A S D or the arrow keys. Diagonal input is normalized.'],
    ['Look around', 'Drag the scene or click to engage mouse look. Use the camera controls to recenter.'],
    ['Remember', 'Press E at a memory prompt. Continue with E or Enter; press Esc to step away.'],
  ];
  const tutorialScheme = controlScheme === 'touch' ? 'touch' : 'desktop';
  const tutorialNarrationKey = `tutorial:${tutorialScheme}:${tutorialStep + 1}`;
  const playTutorialStep = useCallback(() => audioManager.playNarration(
    tutorialNarrationKey,
    NARRATION_ASSETS.tutorial(tutorialScheme, tutorialStep + 1),
  ), [tutorialNarrationKey, tutorialScheme, tutorialStep]);
  const beginAudioTutorial = async () => {
    audioManager.init();
    await audioManager.resume();
    setTutorialStarted(true);
    playTutorialStep();
  };
  const dismissTutorial = () => {
    audioManager.stopNarration();
    setTutorialStarted(false);
    settings.dismissTutorial();
  };
  const completeTutorial = () => {
    audioManager.stopNarration();
    setTutorialStarted(false);
    setWelcomeStep(0);
    settings.completeTutorial();
  };
  const welcomeNarrationKey = `welcome:${welcomeStep + 1}`;
  const playWelcomeStep = useCallback(() => audioManager.playNarration(
    welcomeNarrationKey,
    NARRATION_ASSETS.welcome(welcomeStep + 1),
  ), [welcomeNarrationKey, welcomeStep]);
  const dismissWelcome = () => {
    audioManager.stopNarration(welcomeNarrationKey);
    settings.dismissWelcome();
  };
  useEffect(() => {
    if (!settings.onboardingOpen || !tutorialStarted) return;
    playTutorialStep();
    return () => audioManager.stopNarration(tutorialNarrationKey);
  }, [playTutorialStep, settings.onboardingOpen, tutorialNarrationKey, tutorialStarted]);
  useEffect(() => {
    if (!settings.welcomeOpen) return;
    playWelcomeStep();
    return () => audioManager.stopNarration(welcomeNarrationKey);
  }, [playWelcomeStep, settings.welcomeOpen, welcomeNarrationKey]);

  return <>
    {!settings.panoramaOpen && <header className="experience-hud" aria-label="Exploration controls">
      <div className="experience-brand">
        <span className="experience-brand__monogram" aria-hidden="true">T</span>
        <span className="experience-brand__copy"><span className="experience-brand__eyebrow">Project Taj</span><span className="experience-brand__title">A garden of memories</span></span>
      </div>
      <div className="experience-hud__actions">
        <button className="icon-button" type="button" onClick={settings.openJournal} aria-label="Open memories"><span className="icon-glyph icon-glyph--memories" aria-hidden="true" /></button>
        <button className="icon-button" type="button" onClick={settings.openSettings} aria-label="Open settings and controls"><span className="icon-glyph icon-glyph--menu" aria-hidden="true" /></button>
      </div>
    </header>}
    {!settings.panoramaOpen && <aside className="exploration-whisper" aria-hidden="true">
      <span>Agra · 1648</span>
      <i />
      <span>Follow the water</span>
    </aside>}
    {!settings.panoramaOpen && controlScheme !== 'touch' && <nav className="camera-controls" aria-label="Camera controls">
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { orbitBy(ORBIT_STEP, 0); settleCameraButton(event); }} aria-label="Rotate camera left">←</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { orbitBy(0, PITCH_STEP); settleCameraButton(event); }} aria-label="Tilt camera up">↑</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { resetCamera(); settleCameraButton(event); }} aria-label="Reset camera"><span aria-hidden="true">◎</span><span className="camera-controls__label">Reset</span></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { orbitBy(0, -PITCH_STEP); settleCameraButton(event); }} aria-label="Tilt camera down">↓</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { orbitBy(-ORBIT_STEP, 0); settleCameraButton(event); }} aria-label="Rotate camera right">→</button>
    </nav>}
    {settings.panoramaOpen && <div className="panorama-chrome">
      <div><span>Panorama</span><strong>{settings.panoramaView === 'taj-to-gate' ? 'Taj Mahal → Great Gate' : 'Gate → Taj Mahal'}</strong></div>
      <div className="panorama-chrome__actions">
        <button type="button" className="button-secondary" onClick={() => settings.setPanoramaView(settings.panoramaView === 'gate-to-taj' ? 'taj-to-gate' : 'gate-to-taj')}>
          {settings.panoramaView === 'gate-to-taj' ? 'Switch to Taj → Gate' : 'Switch to Gate → Taj'}
        </button>
        <button type="button" className="button-primary" onClick={settings.closePanorama}>Return to garden</button>
      </div>
    </div>}
    {settings.onboardingOpen && <section className="premium-modal premium-modal--compact" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="modal-kicker">Exploration {tutorialStep + 1} of {tutorial.length}</div><h1 id="tutorial-title">{tutorial[tutorialStep][0]}</h1><p>{tutorial[tutorialStep][1]}</p>
      <div className="tutorial-voice" data-active={tutorialStarted}>
        <span aria-hidden="true">◖</span>
        <span>{tutorialStarted ? 'Warm voice guidance is playing' : 'Optional narrated guidance'}</span>
      </div>
      <div className="tutorial-progress" aria-hidden="true">{tutorial.map((_, index) => <i key={index} data-active={index === tutorialStep} />)}</div>
      <div className="modal-actions">
        <button type="button" className="button-quiet" onClick={dismissTutorial}>Skip</button>
        {!tutorialStarted
          ? <button type="button" className="button-primary" onClick={() => void beginAudioTutorial()}>Start audio guide</button>
          : tutorialStep < tutorial.length - 1
            ? <button type="button" className="button-primary" onClick={() => setTutorialStep((value) => value + 1)}>Next</button>
            : <button type="button" className="button-primary" onClick={completeTutorial}>Continue</button>}
      </div>
    </section>}
    {settings.welcomeOpen && <section className="premium-modal premium-modal--welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="modal-kicker">A note for you · {welcomeStep + 1} of {WELCOME_LINES.length}</div>
      <h1 id="welcome-title">{WELCOME_LINES[welcomeStep][0]}</h1>
      <p>{WELCOME_LINES[welcomeStep][1]}</p>
      <div className="tutorial-progress" aria-hidden="true">{WELCOME_LINES.map((_, index) => <i key={index} data-active={index === welcomeStep} />)}</div>
      <div className="modal-actions">
        <button type="button" className="button-quiet" onClick={playWelcomeStep}>Replay line</button>
        {welcomeStep < WELCOME_LINES.length - 1
          ? <button type="button" className="button-primary" onClick={() => setWelcomeStep((value) => value + 1)}>Continue</button>
          : <button type="button" className="button-primary" onClick={dismissWelcome}>Begin the journey</button>}
      </div>
    </section>}
    {settings.journalOpen && <MemoriesJournal onClose={settings.closeJournal} />}
    {settings.settingsOpen && <section className="premium-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-heading"><div><div className="modal-kicker">Experience</div><h1 id="settings-title">Settings & controls</h1></div><button className="icon-button" type="button" onClick={settings.closeSettings} aria-label="Close settings">×</button></div>
      <div className="settings-grid">
        <label>Camera sensitivity <output>{settings.cameraSensitivity.toFixed(1)}×</output><input type="range" min="0.5" max="1.8" step="0.1" value={settings.cameraSensitivity} onChange={(event) => settings.set({ cameraSensitivity: Number(event.target.value) })} /></label>
        <label>Walking pace <output>{settings.movementSpeed.toFixed(1)}×</output><input type="range" min="0.75" max="1.35" step="0.05" value={settings.movementSpeed} onChange={(event) => settings.set({ movementSpeed: Number(event.target.value) })} /></label>
        <label>Interface scale <output>{Math.round(settings.interfaceScale * 100)}%</output><input type="range" min="0.9" max="1.2" step="0.05" value={settings.interfaceScale} onChange={(event) => settings.set({ interfaceScale: Number(event.target.value) })} /></label>
        <label>Camera view<select value={settings.cameraPerspective} onChange={(event) => settings.set({ cameraPerspective: event.target.value as typeof settings.cameraPerspective })}><option value="third-person">3rd Person (Default)</option><option value="first-person">1st Person (Immersive)</option></select></label>
        <label>Graphics quality<select value={settings.quality} onChange={(event) => settings.set({ quality: event.target.value as typeof settings.quality })}><option value="auto">Auto</option><option value="high">High</option><option value="balanced">Balanced</option><option value="performance">Performance</option></select></label>
        <label>Master volume <output>{Math.round(settings.audioMasterVolume * 100)}%</output><input aria-label="Master volume" type="range" min="0" max="1" step="0.05" value={settings.audioMasterVolume} onChange={(event) => settings.set({ audioMasterVolume: Number(event.target.value) })} /></label>
        <label>Garden ambience <output>{Math.round(settings.audioAmbienceVolume * 100)}%</output><input aria-label="Garden ambience volume" type="range" min="0" max="1" step="0.05" value={settings.audioAmbienceVolume} onChange={(event) => settings.set({ audioAmbienceVolume: Number(event.target.value) })} /></label>
        <label>Effects and memories <output>{Math.round(settings.audioEffectsVolume * 100)}%</output><input aria-label="Effects and memory volume" type="range" min="0" max="1" step="0.05" value={settings.audioEffectsVolume} onChange={(event) => settings.set({ audioEffectsVolume: Number(event.target.value) })} /></label>
        <label>Voice narration <output>{Math.round(settings.audioNarrationVolume * 100)}%</output><input aria-label="Voice narration volume" type="range" min="0" max="1" step="0.05" value={settings.audioNarrationVolume} onChange={(event) => settings.set({ audioNarrationVolume: Number(event.target.value) })} /></label>
      </div>
      <div className="settings-toggles"><label><input type="checkbox" checked={settings.invertCameraY} onChange={(event) => settings.set({ invertCameraY: event.target.checked })} /> Invert vertical camera</label><label><input type="checkbox" checked={settings.shadows} onChange={(event) => settings.set({ shadows: event.target.checked })} /> Shadows</label><label><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduced motion</label><label><input type="checkbox" checked={audioMuted} onChange={(event) => setAudioMuted(event.target.checked)} /> Mute audio</label></div>
      <section className="settings-view-section" aria-labelledby="display-view-title">
        <div className="settings-view-section__heading"><strong id="display-view-title">Display & view</strong><span>Immersive ways to experience the garden</span></div>
        <div className="settings-view-actions">
          <button type="button" onClick={() => void toggleFullscreen()}><span className="settings-view-action__icon" aria-hidden="true">⛶</span><span><strong>{fullscreen ? 'Exit full screen' : 'Enter full screen'}</strong><small>Use the entire display</small></span></button>
          <button type="button" onClick={() => openPanorama('gate-to-taj')}><span className="settings-view-action__icon" aria-hidden="true">◫</span><span><strong>Gate → Taj panorama</strong><small>See Taj Mahal & Charbagh</small></span></button>
          <button type="button" onClick={() => openPanorama('taj-to-gate')}><span className="settings-view-action__icon" aria-hidden="true">◫</span><span><strong>Taj → Gate panorama</strong><small>See Great Gate & Charbagh</small></span></button>
        </div>
      </section>
      <div className="control-reference"><strong>Controls</strong><span>{controlScheme === 'touch' ? 'Left drag: move · Right drag: look · Tap: interact' : 'WASD / arrows: move · Drag / mouse: look · E: interact · C: reset camera · Esc: release'}</span></div>
      <div className="modal-actions"><button type="button" className="button-quiet" onClick={settings.reset}>Reset settings</button><button type="button" className="button-quiet" onClick={() => { setTutorialStep(0); setTutorialStarted(false); setWelcomeStep(0); settings.replayTutorial(); }}>Replay tutorial</button><button type="button" className="button-quiet" onClick={startFresh}>Start fresh</button><button type="button" className="button-primary" onClick={settings.closeSettings}>Done</button></div>
    </section>}
  </>;
}
