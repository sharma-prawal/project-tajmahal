import { MEMORY_DEFINITIONS } from './definitions';
import { MemoryVolume } from './MemoryVolume';
import { MemoryLandmarks } from './MemoryLandmarks';
import { MemoryLandmarkCapture } from './MemoryLandmarkCapture';
import { MemoryCompletionBridge } from './MemoryCompletionBridge';
import { BridgeReviewOverlay } from './BridgeReviewOverlay';

/**
 * Runs all seven memory volumes through the one shared component (Part 6), and
 * draws the landmark system that shows their state.
 *
 * The split is deliberate: `MemoryVolume` is seven invisible state machines,
 * `MemoryLandmarks` is one instanced renderer for all of them. Phase 10D.1
 * separated them so the visual could be replaced wholesale without reopening
 * any gameplay logic.
 */
export function MemoryVolumes() {
  return (
    <>
      {MEMORY_DEFINITIONS.map((definition) => (
        <MemoryVolume key={definition.id} definition={definition} />
      ))}
      <MemoryLandmarks />
      <MemoryCompletionBridge />
      <MemoryLandmarkCapture />
      <BridgeReviewOverlay />
    </>
  );
}
