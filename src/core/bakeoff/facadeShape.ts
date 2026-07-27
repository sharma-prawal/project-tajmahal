import { Path, Shape } from 'three';
import { TAJ_PROPORTIONS } from './tajProportions';
import type { LodLevel } from './lod';

/**
 * Builds the façade quarter's outer boundary with a real arch opening cut
 * as a hole (Part 11: "real openings only where required", "no runtime
 * CSG" — this is authored geometry via `ExtrudeGeometry`'s shape+hole
 * support, not a boolean operation). LOD2 has no hole at all (simplified
 * silhouette, Part 11).
 */
export function buildFacadeShape(lod: LodLevel): Shape {
  const { width, height } = TAJ_PROPORTIONS.facade;
  const halfWidth = width / 2;

  const outer = new Shape();
  outer.moveTo(-halfWidth, 0);
  outer.lineTo(halfWidth, 0);
  outer.lineTo(halfWidth, height);
  outer.lineTo(-halfWidth, height);
  outer.lineTo(-halfWidth, 0);

  if (lod === 'lod2') {
    return outer; // no opening — simplified silhouette only
  }

  const { width: archWidth, height: archHeight, apexRatio } = TAJ_PROPORTIONS.arch;
  const archHalfWidth = archWidth / 2;
  const springline = archHeight * (1 - apexRatio * 0.5);
  const apexY = archHeight;

  const hole = new Path();
  hole.moveTo(-archHalfWidth, 0);
  hole.lineTo(-archHalfWidth, springline);
  if (lod === 'lod0') {
    // Pointed (two-centered) arch — a real recess, not a simple round-top.
    hole.quadraticCurveTo(-archHalfWidth, apexY, 0, apexY);
    hole.quadraticCurveTo(archHalfWidth, apexY, archHalfWidth, springline);
  } else {
    // lod1: simpler round-top arch — still a real opening, less detail.
    hole.absarc(0, springline, archHalfWidth, Math.PI, 0, true);
  }
  hole.lineTo(archHalfWidth, 0);
  hole.lineTo(-archHalfWidth, 0);

  outer.holes.push(hole);
  return outer;
}
