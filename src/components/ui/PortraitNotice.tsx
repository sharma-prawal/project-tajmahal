import { useDeviceStore } from '@state/useDeviceStore';
import { useIsPortrait } from '@hooks/useIsPortrait';
import { SAFE_AREA_INSET } from '@constants/touchRegions';

/**
 * Landscape is the intended play orientation on touch devices (Part 9). In
 * portrait, this shows a gentle, non-blocking recommendation to rotate —
 * the experience keeps running underneath (no broken layout, no forced
 * lock), matching "supported fallback layout" rather than a hard gate.
 */
export function PortraitNotice() {
  const controlScheme = useDeviceStore((state) => state.controlScheme);
  const isPortrait = useIsPortrait();

  if (controlScheme !== 'touch' || !isPortrait) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: `calc(${SAFE_AREA_INSET.top} + 12px)`,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        pointerEvents: 'none',
        background: 'rgba(10,10,10,0.6)',
        color: '#e8ddc9',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        padding: '8px 16px',
        borderRadius: 999,
        textAlign: 'center',
      }}
    >
      Rotate your device for the full experience
    </div>
  );
}
