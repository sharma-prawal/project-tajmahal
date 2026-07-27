import { BufferAttribute, BufferGeometry, CylinderGeometry, LatheGeometry, RingGeometry, TorusGeometry, Vector2 } from 'three';
import { mergeParts, transformPart } from '@core/vegetation/productionGeometry';

/**
 * Adds a flat white `color` attribute so per-instance tinting actually shows.
 *
 * three r169's `color_fragment` chunk multiplies `vColor` into the diffuse
 * **only under `USE_COLOR`** — `USE_INSTANCING_COLOR` alone computes `vColor`
 * and then never applies it. So a material needs `vertexColors: true` for
 * drei's per-`Instance` `color` to appear at all, and `vertexColors` without a
 * geometry `color` attribute reads an undefined attribute as zero and renders
 * the mesh **black**. Both halves are required; this supplies the second.
 *
 * Found the hard way: the first build of the inlay ring came out solid black in
 * all four states, which is exactly what "no colour attribute" looks like.
 */
function withWhiteVertexColors(geometry: BufferGeometry): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(count * 3).fill(1), 3));
  return geometry;
}

/**
 * Phase 10D.1 — the *chirag* landmark: a marble lamp post on a low octagonal
 * plinth, the form Mughal gardens actually used to mark a tended place.
 *
 * Everything is octagonal because the Charbagh is: eight-sided plinths, posts
 * and finials are the vocabulary already standing all over this world in the
 * pool kerb, the pavilion posts and the platform balustrade. The landmark has
 * to look like it was always there, which means borrowing the world's own
 * geometry rather than inventing a shape for it.
 */

/** Height of the marble itself — the open rim of the lamp cup. */
export const LANDMARK_MARBLE_HEIGHT = 1.575;
/**
 * Centre height of the flame, deliberately *above* the cup rim.
 *
 * The first build put a finial hood on top of the cup and the flame inside it,
 * at which point the flame was sealed in and invisible from every angle — the
 * capture showed a lamp that never lit. A chirag is an open oil lamp with no
 * hood, so the hood is gone and the flame stands proud of the rim: more
 * authentic and, more to the point, actually visible.
 */
export const LANDMARK_FLAME_Y = 1.62;
/** Radius the inlay ring sits at, on the plinth's top face. */
export const LANDMARK_RING_RADIUS = 0.4;
/**
 * Height of the inlay ring.
 *
 * The plinth fillet ends at y=0.185. Keeping the ring on that exact plane
 * caused depth-buffer competition (the broken/flickering gold seen at close
 * range), so the inlay sits 7 mm proud of the stone face.
 */
export const LANDMARK_RING_Y = 0.192;

/**
 * Plinth + shaft + lamp cup, merged into one geometry so the whole marble mass
 * of every landmark in the world is a single instanced draw call.
 */
export function createLandmarkPillarGeometry(): BufferGeometry {
  return mergeParts([
    // Chowki — a low octagonal plinth, slightly battered like the pool kerb.
    transformPart(new CylinderGeometry(0.54, 0.6, 0.14, 8), [0, 0.07, 0], [1, 1, 1]),
    // A thin fillet, so the plinth reads as cut stone rather than one extrusion.
    transformPart(new CylinderGeometry(0.5, 0.54, 0.045, 8), [0, 0.1625, 0], [1, 1, 1]),
    // Shaft — tapered, slender enough to stay a silhouette and not a bollard.
    transformPart(new CylinderGeometry(0.1, 0.145, 1.16, 8), [0, 0.765, 0], [1, 1, 1]),
    // Collar under the lamp cup.
    transformPart(new CylinderGeometry(0.15, 0.115, 0.06, 8), [0, 1.375, 0], [1, 1, 1]),
    // Lamp cup — open, like the oil lamp it is. Nothing sits above it.
    transformPart(new CylinderGeometry(0.175, 0.135, 0.17, 8), [0, 1.49, 0], [1, 1, 1]),
  ]);
}

/**
 * The pietra-dura inlay ring set into the plinth's top face.
 *
 * Flat, lying in the XZ plane. Unlit (`MeshBasicMaterial`) and tinted
 * per-instance, so an unlit memory reads as dark unfilled stone and a
 * completed one reads as filled inlay — the same object in both states, which
 * is what makes the change legible rather than decorative.
 */
export function createLandmarkRingGeometry(): BufferGeometry {
  const ring = new RingGeometry(LANDMARK_RING_RADIUS - 0.055, LANDMARK_RING_RADIUS + 0.055, 32, 1);
  ring.rotateX(-Math.PI / 2);
  ring.translate(0, LANDMARK_RING_Y, 0);
  return withWhiteVertexColors(ring);
}

/**
 * Phase 10E.1 — the vertical state band: a pietra-dura collar inlaid around the
 * shaft, level with a standing player's eye.
 *
 * ## Why the inlay ring alone was not enough
 *
 * The plinth ring reads the state perfectly at 2 m and well at 10 m, and then
 * disappears: it is a flat disc lying on the ground, so its projected area
 * falls off with the *square* of distance **and** it foreshortens toward a line
 * as the viewing angle flattens. At 20 m it is a few pixels of edge.
 *
 * A band wrapped around the shaft has neither problem. It is vertical, so it
 * does not foreshorten with distance along the ground, and it sits on the one
 * part of the lamp that is already the distance silhouette. Measured
 * screen-space area at 20 m is roughly 8x the ring's — see
 * `landmarkReadability.test.ts`, which computes both rather than asserting it.
 *
 * Kept deliberately narrow (7 cm on a 1.6 m post) and given the same
 * per-instance colour as the ring, so it is the *same* pietra-dura language
 * seen on a different plane — not a second signal the player has to learn.
 */
export const LANDMARK_BAND_Y = 1.06;
export const LANDMARK_BAND_HEIGHT = 0.07;

export function createLandmarkBandGeometry(): BufferGeometry {
  // Radius tracks the shaft's taper at this height so the band sits proud of it
  // by ~6 mm, like inlay set into stone rather than a ring hung around it.
  return withWhiteVertexColors(mergeParts([
    transformPart(
      new CylinderGeometry(0.1235, 0.1265, LANDMARK_BAND_HEIGHT, 8, 1, true),
      [0, LANDMARK_BAND_Y, 0],
      [1, 1, 1],
    ),
    // State-coloured oil cup immediately under the flame. It keeps the bright
    // flame visually attached even when the pale marble shaft crosses a pale
    // wall or path in the background.
    transformPart(new CylinderGeometry(0.17, 0.15, 0.045, 8), [0, 1.565, 0], [1, 1, 1]),
  ]));
}

/**
 * The flame itself — a small faceted drop inside the lamp cup.
 *
 * Deliberately low-poly: it is 12 cm across, it is unlit, and at every distance
 * beyond arm's reach it is a bright point rather than a shape.
 */
export function createLandmarkFlameGeometry(): BufferGeometry {
  const flame = new LatheGeometry([
    new Vector2(0, 0),
    new Vector2(0.058, 0.025),
    new Vector2(0.082, 0.09),
    new Vector2(0.06, 0.165),
    new Vector2(0.026, 0.225),
    new Vector2(0, 0.255),
  ], 12);
  flame.translate(0, LANDMARK_FLAME_Y - 0.08, 0);
  return withWhiteVertexColors(flame);
}

/**
 * A partial torus lying on the plinth, used only while a memory is revealing.
 *
 * The instanced ring above cannot show progress — `thetaLength` is baked into
 * the geometry and cannot vary per instance without a custom shader. But only
 * one memory can ever be revealing at a time (the player is inside exactly one
 * volume), so the reveal arc is built as a single throwaway mesh instead. One
 * extra draw call for a few seconds, and the reveal becomes a real radial fill
 * rather than a brightness ramp.
 */
export function createLandmarkProgressArcGeometry(progress: number): BufferGeometry {
  const sweep = Math.max(0.0001, Math.min(1, progress)) * Math.PI * 2;
  const arc = new TorusGeometry(LANDMARK_RING_RADIUS, 0.058, 6, 40, sweep);
  arc.rotateX(-Math.PI / 2);
  // Start the fill at the far side and run clockwise, so it closes toward the
  // player standing in front of the landmark.
  arc.rotateY(Math.PI / 2);
  arc.translate(0, LANDMARK_RING_Y + 0.012, 0);
  return arc;
}
