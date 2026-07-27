import { Box3, BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, LatheGeometry, Vector2, Vector3 } from 'three';
import { buildDomeProfilePoints } from './domeGeometry';
import { buildFacadeShape } from './facadeShape';
import { buildMinaretSections } from './minaretGeometry';
import { TAJ_PROPORTIONS } from './tajProportions';
import type { LodLevel } from './lod';

/** Mirrors `DomeModule`/`MinaretModule`/`FacadeQuarterModule`'s per-LOD segment tables — kept here so the headless report and the renderer can't silently diverge (both read `TAJ_PROPORTIONS`, but the segment counts are display-tuning, not proportion data). */
const DOME_SEGMENTS_BY_LOD: Record<LodLevel, { profilePoints: number; latheSegments: number }> = {
  lod0: { profilePoints: TAJ_PROPORTIONS.dome.profile.length, latheSegments: TAJ_PROPORTIONS.dome.latheSegments },
  lod1: { profilePoints: 4, latheSegments: 14 },
  lod2: { profilePoints: 3, latheSegments: 8 },
};

const MINARET_SEGMENTS_BY_LOD: Record<LodLevel, { radialSegments: number; sectionCount: number; showBand: boolean }> = {
  lod0: { radialSegments: 12, sectionCount: TAJ_PROPORTIONS.minaret.sectionCount, showBand: true },
  lod1: { radialSegments: 8, sectionCount: 2, showBand: true },
  lod2: { radialSegments: 6, sectionCount: 1, showBand: false },
};

const FACADE_CURVE_SEGMENTS_BY_LOD: Record<LodLevel, number> = { lod0: 12, lod1: 6, lod2: 1 };

export interface LodReport {
  lod: LodLevel;
  triangles: number;
  vertices: number;
  geometryCount: number;
  materialSlotCount: number;
  moduleCount: number;
  bounds: { size: { x: number; y: number; z: number } };
  shadowCasters: number;
  estimatedMobileCostShare: number;
}

export interface LodValidationIssue {
  lod: LodLevel;
  geometryLabel: string;
  issue: string;
}

function countGeometry(geometry: BufferGeometry): { triangles: number; vertices: number } {
  const position = geometry.attributes.position;
  const vertices = position?.count ?? 0;
  const triangles = geometry.index ? geometry.index.count / 3 : vertices / 3;
  return { triangles: Math.round(triangles), vertices };
}

function validateGeometry(geometry: BufferGeometry, label: string, lod: LodLevel, issues: LodValidationIssue[]): void {
  const position = geometry.attributes.position;
  if (position) {
    for (let i = 0; i < position.count; i += 1) {
      if (!Number.isFinite(position.getX(i)) || !Number.isFinite(position.getY(i)) || !Number.isFinite(position.getZ(i))) {
        issues.push({ lod, geometryLabel: label, issue: `NaN/infinite position at vertex ${i}` });
        break;
      }
    }
  }
  const normal = geometry.attributes.normal;
  if (normal) {
    for (let i = 0; i < normal.count; i += 1) {
      const x = normal.getX(i);
      const y = normal.getY(i);
      const z = normal.getZ(i);
      const lengthSq = x * x + y * y + z * z;
      if (!Number.isFinite(lengthSq) || lengthSq < 1e-6) {
        issues.push({ lod, geometryLabel: label, issue: `degenerate normal at vertex ${i}` });
        break;
      }
    }
  }
}

/**
 * Builds every module's real geometry for one LOD level, headlessly (no
 * React/R3F), for the Part 6 technical-measurement report and its
 * validation checks. Reuses the exact same pure builders the renderer uses
 * (`buildDomeProfilePoints`, `buildFacadeShape`, `buildMinaretSections`),
 * so the numbers here can't drift from what the bake-off slice actually
 * renders.
 */
export function buildLodReport(lod: LodLevel, issues: LodValidationIssue[] = []): LodReport {
  const domeSeg = DOME_SEGMENTS_BY_LOD[lod];
  const domePoints = buildDomeProfilePoints(domeSeg.profilePoints).map((p) => new Vector2(p.x, p.y));
  const domeLathe = new LatheGeometry(domePoints, domeSeg.latheSegments);
  const { drumRadius, drumHeight } = TAJ_PROPORTIONS.dome;
  const domeDrum = new CylinderGeometry(drumRadius, drumRadius, drumHeight, domeSeg.latheSegments);

  const minaretSeg = MINARET_SEGMENTS_BY_LOD[lod];
  const sections = buildMinaretSections(minaretSeg.sectionCount);
  const minaretCylinders = sections.map(
    (section) => new CylinderGeometry(section.rEnd, section.rStart, section.height, minaretSeg.radialSegments),
  );
  const { balconyBandThickness, balconyBandHeightFraction, balconyBandRadiusMultiplier, baseRadius, topRadius } =
    TAJ_PROPORTIONS.minaret;
  const bandRadius = (baseRadius + (topRadius - baseRadius) * balconyBandHeightFraction) * balconyBandRadiusMultiplier;
  const minaretBand = minaretSeg.showBand
    ? new CylinderGeometry(bandRadius, bandRadius, balconyBandThickness, minaretSeg.radialSegments)
    : null;
  const minaretCap = new ConeGeometry(topRadius * 1.1, 0.8, minaretSeg.radialSegments);

  const facadeShape = buildFacadeShape(lod);
  const facadeGeometry = new ExtrudeGeometry(facadeShape, {
    depth: TAJ_PROPORTIONS.facade.depth,
    bevelEnabled: false,
    curveSegments: FACADE_CURVE_SEGMENTS_BY_LOD[lod],
  });

  const geometries: { geometry: BufferGeometry; label: string }[] = [
    { geometry: domeLathe, label: 'dome-lathe' },
    { geometry: domeDrum, label: 'dome-drum' },
    ...minaretCylinders.map((geometry, i) => ({ geometry, label: `minaret-section-${i}` })),
    { geometry: minaretCap, label: 'minaret-cap' },
    { geometry: facadeGeometry, label: 'facade' },
  ];
  if (minaretBand) geometries.push({ geometry: minaretBand, label: 'minaret-band' });

  let triangles = 0;
  let vertices = 0;
  const bounds = new Box3();
  bounds.makeEmpty();
  for (const { geometry, label } of geometries) {
    const counts = countGeometry(geometry);
    triangles += counts.triangles;
    vertices += counts.vertices;
    // Each of these primitive geometry types (Lathe/Cylinder/Cone/Extrude) already
    // computes correct normals at construction — recomputing here would clobber the
    // pole/apex vertices with spurious near-zero normals from naive per-vertex averaging.
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
    validateGeometry(geometry, label, lod, issues);
  }

  const size = bounds.getSize(new Vector3());
  const boundsSize = bounds.isEmpty() ? { x: 0, y: 0, z: 0 } : { x: size.x, y: size.y, z: size.z };

  // Shadow casters: one per mesh that would render with castShadow (all of them except the diagnostic-only band at lod2, which doesn't exist there anyway).
  const shadowCasters = geometries.length;
  const materialSlotCount = minaretBand ? 3 : 2; // marble (dome+minaret+facade share one slot), band tint, cap — approximated per the shipped modules' material assignment
  const estimatedMobileCostShare = triangles / 150_000; // fraction of the mobile-low tri budget (Part 11 TIER_BUDGETS.mobileLow.visibleTriangles)

  return {
    lod,
    triangles,
    vertices,
    geometryCount: geometries.length,
    materialSlotCount,
    moduleCount: 3,
    bounds: { size: boundsSize },
    shadowCasters,
    estimatedMobileCostShare,
  };
}

export function buildAllLodReports(): Record<LodLevel, LodReport> {
  return { lod0: buildLodReport('lod0'), lod1: buildLodReport('lod1'), lod2: buildLodReport('lod2') };
}
