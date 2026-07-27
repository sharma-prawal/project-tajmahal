import { useDeviceStore } from '@state/useDeviceStore';
import { SAFE_AREA_INSET } from '@constants/touchRegions';
import { useExperienceSettingsStore } from '@state/useExperienceSettingsStore';

/**
 * Purely visual placeholder marking where joystick/look zones live. Real
 * touch handling is done in useTouchControls directly on the canvas element;
 * this overlay just gives mobile players a visual anchor and is safe to
 * restyle or replace wholesale later without touching input logic.
 *
 * Positioned with safe-area insets (Part 9) so it never sits under a
 * notch/home-indicator/rounded-corner system area.
 */
export function TouchControlsOverlay() {
  const controlScheme = useDeviceStore((state) => state.controlScheme);
  const panoramaOpen = useExperienceSettingsStore((state) => state.panoramaOpen);
  if (controlScheme !== 'touch' || panoramaOpen) return null;

  return (
    <div className="touch-controls" style={{ paddingTop: SAFE_AREA_INSET.top, paddingRight: SAFE_AREA_INSET.right, paddingBottom: SAFE_AREA_INSET.bottom, paddingLeft: SAFE_AREA_INSET.left }} aria-hidden="true">
      <div className="touch-controls__move"><i /><span>Move</span></div><div className="touch-controls__look"><span>Drag to look</span><i>↔</i></div>
    </div>
  );
}
