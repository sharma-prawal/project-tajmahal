import { Html } from '@react-three/drei';
import { env } from '@config/env';
import { AXIS_LAYOUT, MAUSOLEUM, PLATFORM } from '@constants/world';
import { GREYBOX_COLOR } from '@constants/greyboxMaterials';

const gateZ = (AXIS_LAYOUT.gateStart + AXIS_LAYOUT.gateEnd) / 2;
const gardenZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
const poolZ = (AXIS_LAYOUT.poolStart + AXIS_LAYOUT.poolEnd) / 2;
const platformZ = (AXIS_LAYOUT.stairsEnd + AXIS_LAYOUT.platformEnd) / 2;
const doorZ = AXIS_LAYOUT.mausoleumStart;
const interiorZ = AXIS_LAYOUT.mausoleumEnd + MAUSOLEUM.depth * 0.3;
const plinthZ = AXIS_LAYOUT.mausoleumEnd + MAUSOLEUM.depth * 0.5;

const MARKERS: Array<{ label: string; position: [number, number, number] }> = [
  { label: 'forecourt', position: [0, 1.5, AXIS_LAYOUT.forecourtStart - 10] },
  { label: 'gate reveal', position: [0, 1.5, gateZ] },
  { label: 'garden', position: [0, 1.5, gardenZ] },
  { label: 'reflecting pool', position: [0, 1.5, poolZ] },
  { label: 'platform', position: [0, PLATFORM.height + 1.5, platformZ] },
  { label: 'main door', position: [0, PLATFORM.height + 3, doorZ] },
  { label: 'interior', position: [0, PLATFORM.height + 1.5, interiorZ] },
  { label: 'letter plinth', position: [0, PLATFORM.height + 2, plinthZ] },
];

/**
 * Fixed development-only markers at the eight named review positions
 * (Part 3) — support deterministic screenshot comparison later (a marker
 * gives a stable, labeled anchor to frame a capture around). Gated behind
 * `env.enableDebugTools` like the rest of `components/dev`, even though it
 * lives under `environment/` since it's placed relative to greybox geometry.
 */
export function ReviewMarkers() {
  if (!env.enableDebugTools || new URLSearchParams(window.location.search).has('cleanCapture')) return null;

  return (
    <>
      {MARKERS.map((marker) => (
        <group key={marker.label} position={marker.position}>
          <mesh>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshBasicMaterial color={GREYBOX_COLOR.reviewMarker} />
          </mesh>
          <Html center distanceFactor={20} style={{ pointerEvents: 'none' }}>
            <div
              style={{
                background: 'rgba(0,0,0,0.7)',
                color: GREYBOX_COLOR.reviewMarker,
                fontFamily: 'monospace',
                fontSize: 12,
                padding: '2px 6px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
                transform: 'translateY(-24px)',
              }}
            >
              {marker.label}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}
