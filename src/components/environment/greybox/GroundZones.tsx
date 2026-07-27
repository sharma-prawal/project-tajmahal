import { useEffect, useMemo } from 'react';
import { buildGroundSurfaceGeometry, frameRects } from '@core/environment/groundSurface';
import { useGroundSurfaces } from '@core/environment/useGroundSurfaces';
import { APRON_RECTS, GROUND_ZONE_TILE, GROUND_ZONE_Y, QUADRANT_CELL_RECTS } from '@constants/groundZones';

/**
 * Phase 9A layered ground surfaces sitting on the shared `Terrain` collider.
 * Each surface type is one merged, world-planar-UV geometry → one draw call:
 *
 *   • sandstone-dust apron under the ceremonial spine (forecourt, approach,
 *     plinth surround) — replaces bare dirt with a designed walking court;
 *   • packed-gravel quadrant beds — the lawn rests on these, so every
 *     grass→paving edge becomes a gravel mowing-strip instead of a dirt seam.
 *
 * Ground surfaces never cast shadows (they only receive), keeping the already
 * tight shadow-caster budget untouched.
 */
export function GroundZones() {
  const { sandstone, gravel } = useGroundSurfaces();

  const apronGeometry = useMemo(
    () => buildGroundSurfaceGeometry(APRON_RECTS, { y: GROUND_ZONE_Y.apron, tile: GROUND_ZONE_TILE.apron }),
    [],
  );
  const gravelGeometry = useMemo(
    () => buildGroundSurfaceGeometry(
      // Quadrant beds the lawns rest on, plus a gravel skirt ringing each apron
      // so the sandstone court softens out through gravel into the earth base
      // instead of ending on a hard line.
      [...QUADRANT_CELL_RECTS, ...APRON_RECTS.flatMap((rect) => frameRects(rect, 1.6))],
      { y: GROUND_ZONE_Y.gravel, tile: GROUND_ZONE_TILE.gravel },
    ),
    [],
  );
  useEffect(() => () => {
    apronGeometry.dispose();
    gravelGeometry.dispose();
  }, [apronGeometry, gravelGeometry]);

  return (
    <>
      <mesh geometry={gravelGeometry} material={gravel} receiveShadow />
      <mesh geometry={apronGeometry} material={sandstone} receiveShadow />
    </>
  );
}
