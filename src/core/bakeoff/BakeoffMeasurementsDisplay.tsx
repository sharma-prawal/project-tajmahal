import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';
import { env } from '@config/env';
import { useBakeoffMeasurements } from './BakeoffMeasurements';
import { TAJ_PROPORTIONS } from './tajProportions';

const MOBILE_TRIANGLE_BUDGET_SHARE = 0.15; // rough share of the mobile-low triangle budget (Part 11) this slice alone may reasonably cost once it's the full detailed Taj

/** Dev-only text readout mounted next to the bake-off slice (Part 11 measurements). */
export function BakeoffMeasurementsDisplay() {
  const measurement = useBakeoffMeasurements();
  const boundsSize = useMemo(() => {
    if (!measurement.bounds) return null;
    return measurement.bounds.getSize(new Vector3());
  }, [measurement.bounds]);

  if (!env.enableDebugTools) return null;

  const domeApex = TAJ_PROPORTIONS.dome.drumHeight + TAJ_PROPORTIONS.dome.apexHeight;

  return (
    <Html position={[0, domeApex + 4, 0]} center distanceFactor={25} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          background: 'rgba(0,0,0,0.75)',
          color: '#e8ddc9',
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '6px 10px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}
      >
        <div>Taj bake-off slice — {measurement.lodLabel}</div>
        <div>triangles: {measurement.triangles.toLocaleString()}</div>
        <div>materials: {measurement.materials}</div>
        <div>modules: {measurement.moduleCount}</div>
        <div>
          bounds:{' '}
          {boundsSize
            ? `${boundsSize.x.toFixed(1)} x ${boundsSize.y.toFixed(1)} x ${boundsSize.z.toFixed(1)}`
            : 'n/a'}
        </div>
        <div>~{Math.round(MOBILE_TRIANGLE_BUDGET_SHARE * 100)}% of one mobile-low tri budget share (est.)</div>
      </div>
    </Html>
  );
}
