import { ContactShadows } from '@react-three/drei';
import { AXIS_LAYOUT, PAVILION } from '@constants/world';
import {
  TAJ_CENTER_Z,
  TAJ_PRESENTATION_FOOTPRINT,
} from '@constants/tajPlacement';
import { CONTACT_SHADOWS } from '@constants/scene';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { useReviewRenderSettings } from '@core/bakeoff/useReviewRenderSettings';

const pavilionZ = (AXIS_LAYOUT.approachStart + AXIS_LAYOUT.approachEnd) / 2;

/**
 * Cheap baked contact-shadow catchers (`frames={1}` — one-time offscreen
 * renders, not per-frame SSAO). Phase 4B grounded the Taj against its platform;
 * Phase 9C.1 extends the same efficient technique to the two garden gazebos,
 * which sit outside the directional shadow map's frustum and previously floated.
 * Benches/fountains/trees/heroine near the player are grounded by the dynamic
 * shadow map, so they don't need their own catcher. Skipped when shadows are
 * off (the effect reads as noise without a real shadow map behind it).
 */
export function ContactShadowsGround() {
  const deviceQuality = useQualityProfile();
  const quality = useReviewRenderSettings(deviceQuality);

  if (!quality.shadows) return null;

  return (
    <>
      <ContactShadows
        position={[0, 0.02, TAJ_CENTER_Z]}
        opacity={CONTACT_SHADOWS.opacity}
        blur={CONTACT_SHADOWS.blur}
        far={CONTACT_SHADOWS.farPlane}
        resolution={CONTACT_SHADOWS.resolution}
        width={TAJ_PRESENTATION_FOOTPRINT * 1.08}
        height={TAJ_PRESENTATION_FOOTPRINT * 1.08}
        frames={1}
        color="#1a140c"
      />
      {[-PAVILION.axisOffset, PAVILION.axisOffset].map((x) => (
        <ContactShadows
          key={x}
          position={[x, 0.02, pavilionZ]}
          opacity={CONTACT_SHADOWS.opacity * 0.85}
          blur={2.8}
          far={4}
          resolution={256}
          width={PAVILION.width * 1.5}
          height={PAVILION.depth * 1.6}
          frames={1}
          color="#1a140c"
        />
      ))}
    </>
  );
}
