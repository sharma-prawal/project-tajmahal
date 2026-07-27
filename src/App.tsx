import { lazy, Suspense } from 'react';
import { PlayerTargetProvider } from '@core/camera/PlayerTargetContext';
import { CameraStateProvider } from '@core/camera/CameraStateContext';
import { CanvasErrorBoundary } from '@core/loading/CanvasErrorBoundary';
import { LoadingBridge } from '@core/loading/LoadingBridge';
import { LoadingScreen } from '@core/loading/LoadingScreen';
import { TouchControlsOverlay } from '@components/ui/TouchControlsOverlay';
import { PortraitNotice } from '@components/ui/PortraitNotice';
import { PerfHud } from '@components/dev/PerfHud';
import { BakeoffReviewHud } from '@core/bakeoff/BakeoffReviewHud';
import { BakeoffReviewControls } from '@core/bakeoff/BakeoffReviewControls';
import { LightingDebugHud } from '@core/lighting/LightingDebugHud';
import { LightingDebugControls } from '@core/lighting/LightingDebugControls';
import { useAudioManager } from '@hooks/useAudioManager';
import { useActiveInputTracking } from '@hooks/useActiveInputTracking';
import { useAutoSave } from '@core/save/useAutoSave';
import { useInterruptionRecovery } from '@core/recovery/useInterruptionRecovery';
import { WaterDebugHud } from '@core/water/WaterDebugHud';
import { WaterDebugControls } from '@core/water/WaterDebugControls';
import { AtmosphereDebugHud } from '@core/atmosphere/AtmosphereDebugHud';
import { AtmosphereDebugControls } from '@core/atmosphere/AtmosphereDebugControls';
import { AmbientLifeDebugHud } from '@core/ambient/AmbientLifeDebugHud';
import { AmbientLifeDebugControls } from '@core/ambient/AmbientLifeDebugControls';
import { TraversalDebugHud } from '@core/traversal/TraversalDebugHud';
import { TraversalDebugControls } from '@core/traversal/TraversalDebugControls';
import { InteractionInput } from '@core/interaction/InteractionInput';
import { InteractionPrompt } from '@core/interaction/InteractionPrompt';
import { InteractionDebugHud } from '@core/interaction/InteractionDebugHud';
import { InteractionDebugControls } from '@core/interaction/InteractionDebugControls';
import { MemoryDialogue } from '@core/memoryRuntime/MemoryDialogue';
import { MemoryVisibilityPolicy } from '@core/memoryRuntime/MemoryVisibilityPolicy';
import { MemoryRuntimeDebugControls, MemoryRuntimeDebugHud } from '@core/memoryRuntime/MemoryRuntimeDebug';
import { ExperienceChrome } from '@components/ui/ExperienceChrome';
import { CinematicPresentation } from '@core/atmosphere/CinematicPresentation';
import { AudioDebugControls } from '@core/audio/AudioDebug';
import { MemoryJournalToast } from '@components/ui/MemoryJournalToast';
import { FinalLetterExperience } from '@narrative/finale/FinalLetterExperience';

const Experience = lazy(() => import('./Experience'));

export default function App() {
  return <ProductionApp />;
}

function ProductionApp() {
  useAudioManager();
  useActiveInputTracking();
  useAutoSave();
  useInterruptionRecovery();

  return (
    <PlayerTargetProvider>
      <CameraStateProvider>
        <>
          <CanvasErrorBoundary>
            <Suspense fallback={null}>
              <Experience />
            </Suspense>
          </CanvasErrorBoundary>
          <CinematicPresentation />
          <ExperienceChrome />
          <LoadingBridge />
          <LoadingScreen />
          <TouchControlsOverlay />
          <InteractionInput />
          <InteractionPrompt />
          <MemoryDialogue />
          <MemoryJournalToast />
          <FinalLetterExperience />
          <MemoryVisibilityPolicy />
          <PortraitNotice />
          <PerfHud />
          <BakeoffReviewHud />
          <BakeoffReviewControls />
          <LightingDebugHud />
          <LightingDebugControls />
          <WaterDebugHud />
          <WaterDebugControls />
          <AtmosphereDebugHud />
          <AtmosphereDebugControls />
          <AmbientLifeDebugHud />
          <AmbientLifeDebugControls />
          <TraversalDebugHud />
          <TraversalDebugControls />
          <InteractionDebugHud />
          <InteractionDebugControls />
          <MemoryRuntimeDebugHud />
          <MemoryRuntimeDebugControls />
          <AudioDebugControls />
        </>
      </CameraStateProvider>
    </PlayerTargetProvider>
  );
}
