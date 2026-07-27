import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useLoadingStore } from '@state/useLoadingStore';
import { saveManager } from '@core/save/SaveManager';
import { buildSaveSnapshot } from '@core/save/buildSnapshot';

/**
 * WebGL context-loss handling (Part 8). `webglcontextlost` is a DOM event
 * on the canvas, not a React error — `CanvasErrorBoundary` can't see it, so
 * this is a separate listener mounted inside the Canvas (needs `gl` from
 * `useThree`).
 *
 * Recovering a lost context "in place" would mean re-uploading every GPU
 * resource *and* trusting Rapier's WASM physics world survived — neither is
 * guaranteed safe. Per Part 8 ("do not attempt transparent recovery if the
 * renderer or resources cannot safely resume; a controlled reload path is
 * acceptable"), this deliberately does NOT try to resume in place: it saves
 * immediately, then routes to the existing loading-screen error/reload path
 * (`useLoadingStore.setError`) so the player gets a reload affordance
 * instead of a silently blank canvas. Context loss must never corrupt the
 * save — saving happens before anything else.
 */
export function ContextLossHandler() {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;

    const onContextLost = (event: Event) => {
      event.preventDefault(); // allow the browser to fire webglcontextrestored
      saveManager.saveNow(buildSaveSnapshot());
      useLoadingStore.getState().setError('Graphics context was lost. Reload to continue.');
    };

    const onContextRestored = () => {
      // Deliberately a no-op: we already routed to the reload path above.
      // A future phase could attempt true in-place resource re-upload once
      // Rapier world re-initialization is proven safe; not attempted here.
    };

    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    };
  }, [gl]);

  return null;
}
