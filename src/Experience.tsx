import { useEffect } from 'react';
import { CanvasRoot } from '@core/scene/CanvasRoot';
import { Environment } from '@core/scene/Environment';
import { CameraController } from '@core/camera/CameraController';
import { PlayerController } from '@player/PlayerController';
import { PerfStats } from '@components/dev/PerfStats';
import { SunsetTicker } from '@narrative/SunsetTicker';
import { ContextLossHandler } from '@core/recovery/ContextLossHandler';
import { PerfSampler } from '@core/perf/PerfSampler';
import { MemoryVolumes } from '@narrative/memory/MemoryVolumes';
import { TajBakeoffSlice } from '@core/bakeoff/TajBakeoffSlice';
import { BakeoffReviewCamera } from '@core/bakeoff/BakeoffReviewCamera';
import { BakeoffReviewBackdrop } from '@core/bakeoff/BakeoffReviewBackdrop';
import { useLoadingStore } from '@state/useLoadingStore';
import { env } from '@config/env';
import { LightingCaptureCamera } from '@core/lighting/LightingCaptureCamera';
import { TraversalDiagnostics3D } from '@core/traversal/TraversalDiagnostics3D';
import { InteractionSystem } from '@core/interaction/InteractionSystem';
import { ReferenceInteractables } from '@core/interaction/ReferenceInteractables';
import { InteractionDiagnostics3D } from '@core/interaction/InteractionDiagnostics3D';
import { MemoryCameraAdapter, MemoryRuntimeTicker } from '@core/memoryRuntime/MemoryRuntimeSystem';
import { MintsMemoryAnchor, MintsMemoryRegistration } from '@core/memoryRuntime/MintsMemory';
import { BackMemoryAnchor, BackMemoryRegistration, ProductionMemoryRestoration } from '@core/memoryRuntime/BackMemory';
import { UmbrellaMemoryAnchor, UmbrellaMemoryRegistration } from '@core/memoryRuntime/UmbrellaMemory';
import { LittleDetailsMemoryAnchor, LittleDetailsMemoryRegistration } from '@core/memoryRuntime/LittleDetailsMemory';
import { AllDayCallMemoryAnchor, AllDayCallMemoryRegistration } from '@core/memoryRuntime/AllDayCallMemory';
import { BoardingPassesMemoryAnchor, BoardingPassesMemoryRegistration } from '@core/memoryRuntime/BoardingPassesMemory';
import { FridayNightMemoryAnchor, FridayNightMemoryRegistration } from '@core/memoryRuntime/FridayNightMemory';
import { Phase8CCaptureCamera } from '@player/Phase8CCaptureCamera';

/**
 * The 3D canvas and everything in it. Split out of App and loaded via
 * `React.lazy` so the initial JS payload (React, the DOM loading shell,
 * error boundary) is small — Three/Fiber/Rapier only download once this
 * chunk is requested.
 */
export default function Experience() {
  const setExperienceMounted = useLoadingStore((state) => state.setExperienceMounted);

  useEffect(() => {
    setExperienceMounted();
  }, [setExperienceMounted]);

  return (
    <CanvasRoot>
      <Environment />
      <PlayerController />
      <CameraController />
      <Phase8CCaptureCamera />
      <MemoryCameraAdapter />
      <MemoryRuntimeTicker />
      <MintsMemoryRegistration />
      <BackMemoryRegistration />
      <UmbrellaMemoryRegistration />
      <LittleDetailsMemoryRegistration />
      <AllDayCallMemoryRegistration />
      <BoardingPassesMemoryRegistration />
      <FridayNightMemoryRegistration />
      <ProductionMemoryRestoration />
      <InteractionSystem />
      <ReferenceInteractables />
      <MemoryVolumes />
      <SunsetTicker />
      <ContextLossHandler />
      <PerfSampler />
      {env.enableDebugTools && <TajBakeoffSlice />}
      <BakeoffReviewCamera />
      <BakeoffReviewBackdrop />
      <LightingCaptureCamera />
      <PerfStats />
      <TraversalDiagnostics3D />
      <InteractionDiagnostics3D />
      <MintsMemoryAnchor />
      <BackMemoryAnchor />
      <UmbrellaMemoryAnchor />
      <LittleDetailsMemoryAnchor />
      <AllDayCallMemoryAnchor />
      <BoardingPassesMemoryAnchor />
      <FridayNightMemoryAnchor />
    </CanvasRoot>
  );
}
