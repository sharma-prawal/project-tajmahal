import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { env } from '@config/env';
import { useMemoryStore } from './useMemoryStore';
import { useMemoryRevealStore } from './useMemoryRevealStore';
import { useLandmarkCaptureStore } from './useLandmarkCaptureStore';
import { MEMORY_IDS, type MemoryId, type MemoryPhase } from './types';

type LandmarkCaptureWindow = typeof window & {
  __tajLandmarkState?: (phase: MemoryPhase, progress?: number) => void;
};

function parseVector(value: string | null): Vector3 | null {
  if (!value) return null;
  const parts = value.split(',').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Vector3(parts[0], parts[1], parts[2]);
}

/**
 * Dev-only capture rig for the landmark system. Gated on `enableDebugTools`,
 * so it does not exist in a production build.
 *
 * The normal capture harness cannot photograph this system: its review cameras
 * are fixed, and four of the five phases only occur while a player is standing
 * in a volume. Verifying "can someone tell these four states apart without
 * text?" needs the camera parked at a known distance and the phase forced —
 * which is exactly what this provides, and nothing else.
 *
 *   ?landmarkCam=x,y,z&landmarkLook=x,y,z   park the camera
 *   window.__tajLandmarkState('complete')    force every memory's phase
 */
export function MemoryLandmarkCapture() {
  const { camera } = useThree();
  // Memoised: the query string cannot change without a reload, and a fresh
  // `Vector3` every render would retrigger the effect below on every frame.
  const { position, lookAt } = useMemo(() => {
    const params = env.enableDebugTools ? new URLSearchParams(window.location.search) : null;
    return {
      position: parseVector(params?.get('landmarkCam') ?? null),
      lookAt: parseVector(params?.get('landmarkLook') ?? null),
    };
  }, []);

  // Take the camera by yielding, not by racing: `ExplorationCameraRig` drives
  // the camera every frame with damping, so simply writing a position from a
  // later `useFrame` does not reliably win. The rig has an early-return guard
  // for each capture mode; this claims one.
  useEffect(() => {
    if (!position) return;
    useLandmarkCaptureStore.getState().setActive(true);
    return () => useLandmarkCaptureStore.getState().setActive(false);
  }, [position]);

  useEffect(() => {
    if (!env.enableDebugTools) return;
    (window as LandmarkCaptureWindow).__tajLandmarkState = (phase, progress = 0.6) => {
      const capture = useLandmarkCaptureStore.getState();
      capture.setHoldPhases(false);
      const store = useMemoryStore.getState();
      store.reset();
      // Walk the real state machine rather than writing phases directly, so a
      // captured state is always one the game can actually reach.
      const advance: Record<MemoryPhase, (id: MemoryId) => void> = {
        idle: () => {},
        cued: (id) => store.cue(id),
        engaged: (id) => { store.cue(id); store.engage(id); },
        revealing: (id) => { store.cue(id); store.engage(id); store.reveal(id); },
        complete: (id) => { store.cue(id); store.engage(id); store.reveal(id); store.complete(id); },
      };
      MEMORY_IDS.forEach((id) => advance[phase](id));
      if (phase === 'revealing') useMemoryRevealStore.getState().setRevealing('m1', progress);
      else useMemoryRevealStore.setState({ revealing: null });
      // Freeze here, or the volumes cancel every non-terminal phase back to
      // `idle` on the next frame because the player is not standing in them.
      capture.setHoldPhases(true);
    };
    const requestedPhase = new URLSearchParams(window.location.search).get('landmarkPhase');
    if (requestedPhase && ['idle', 'cued', 'engaged', 'revealing', 'complete'].includes(requestedPhase)) {
      (window as LandmarkCaptureWindow).__tajLandmarkState?.(requestedPhase as MemoryPhase);
    }
    return () => { delete (window as LandmarkCaptureWindow).__tajLandmarkState; };
  }, []);

  useFrame(() => {
    if (!position) return;
    camera.position.copy(position);
    if (lookAt) camera.lookAt(lookAt);
  });

  return null;
}
