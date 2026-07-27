import { create } from 'zustand';

/**
 * Phase 10F.2 — imperative camera control for the bridge review overlay.
 *
 * Exists for one reason: speed, and therefore reliability. The first capture
 * runs reloaded the whole page for every frame (37 loads x ~8 s warm-up),
 * which took long enough that a run outlived the machine staying awake — the
 * harness correctly reported a `step-timeout` on frame 3 after a 1000-second
 * heartbeat gap. One page load that is repositioned between shots turns a
 * 25-minute run into roughly a minute, which is short enough to finish
 * inside a single session and cheap enough to re-run whenever a candidate
 * moves.
 *
 * Dev-only: nothing sets this outside `BridgeReviewOverlay`, which is itself
 * gated on `enableDebugTools`.
 */
export interface BridgeReviewCamera {
  position: readonly [number, number, number];
  lookAt: readonly [number, number, number];
}

interface BridgeReviewCameraState {
  camera: BridgeReviewCamera | null;
  setCamera: (camera: BridgeReviewCamera | null) => void;
}

export const useBridgeReviewCameraStore = create<BridgeReviewCameraState>((set) => ({
  camera: null,
  setCamera: (camera) => set({ camera }),
}));
