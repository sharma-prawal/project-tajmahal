import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  Color,
  DoubleSide,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
  VectorKeyframeTrack,
  type Group,
} from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ownershipManager } from '@core/memoryRuntime/OwnershipManager';
import { useBakeoffReviewStore } from '@core/bakeoff/useBakeoffReviewStore';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { useExperienceSettingsStore } from '@state/useExperienceSettingsStore';
import { PLAYER_CAPSULE } from '@constants/physics';
import {
  heroineAnimationTimeScale,
  selectHeroineLocomotion,
  shouldShowHeroine,
  type HeroineLocomotionState,
  type HeroineMotionSnapshot,
} from './heroineAnimation';

const MODEL_URL = '/assets/models/modern-visitor/army-girl-rigged.fbx';
const IDLE_URL = '/assets/models/modern-visitor/army-girl-Idle.fbx';
const WALK_URL = '/assets/models/modern-visitor/army-girl-walking.fbx';
const RUN_URL = '/assets/models/modern-visitor/army-girl-run.fbx';
const TEXTURE_ROOT = '/assets/textures/modern-visitor';
const TARGET_HEIGHT = 1.72;
const CROSSFADE_SECONDS = 0.32;
const VISUAL_CAPSULE_OFFSET = -(PLAYER_CAPSULE.halfHeight + PLAYER_CAPSULE.radius);

interface HeroineProps {
  motion: React.MutableRefObject<HeroineMotionSnapshot>;
  onAnimationFrame?: () => void;
}
type ProductionState = 'idle' | 'walk' | 'run';

const CHARACTER_MATERIAL_GROUPS = [
  { start: 0, count: 2658, materialIndex: 4 },
  { start: 2658, count: 3021, materialIndex: 0 },
  { start: 5679, count: 2658, materialIndex: 4 },
  { start: 8337, count: 591, materialIndex: 1 },
  { start: 8928, count: 432, materialIndex: 5 },
  { start: 9360, count: 18, materialIndex: 1 },
  { start: 9378, count: 282, materialIndex: 0 },
  { start: 9660, count: 180, materialIndex: 4 },
  { start: 9840, count: 3543, materialIndex: 1 },
  { start: 13383, count: 600, materialIndex: 0 },
  { start: 13983, count: 987, materialIndex: 2 },
  { start: 14970, count: 201, materialIndex: 3 },
  { start: 15171, count: 6, materialIndex: 4 },
  { start: 15177, count: 21, materialIndex: 1 },
  { start: 15198, count: 2178, materialIndex: 4 },
  { start: 17376, count: 2373, materialIndex: 0 },
  { start: 19749, count: 2178, materialIndex: 4 },
  { start: 21927, count: 300, materialIndex: 1 },
  { start: 22227, count: 360, materialIndex: 5 },
  { start: 22587, count: 270, materialIndex: 0 },
  { start: 22857, count: 96, materialIndex: 4 },
  { start: 22953, count: 2541, materialIndex: 1 },
  { start: 25494, count: 342, materialIndex: 0 },
  { start: 25836, count: 891, materialIndex: 2 },
  { start: 26727, count: 117, materialIndex: 3 },
] as const;

function hipsBaseline(source: AnimationClip) {
  const track = source.tracks.find(
    (candidate) => candidate instanceof VectorKeyframeTrack &&
      candidate.name.toLowerCase().includes('hips.position'),
  ) as VectorKeyframeTrack | undefined;
  return track?.values[1] ?? 0;
}

/**
 * Removes controller-conflicting root travel and aligns every clip to the same
 * hip height. Vertical root bob is removed as well: preserving it made both
 * feet visibly leave the ground during camera tilts even though the physics
 * capsule remained correctly grounded.
 */
function inPlaceClip(source: AnimationClip, name: ProductionState, sharedHipY: number) {
  const clip = source.clone();
  clip.name = name;
  clip.tracks = clip.tracks.map((track) => {
    if (!(track instanceof VectorKeyframeTrack) || !track.name.toLowerCase().includes('hips.position')) return track;
    const values = [...track.values];
    if (values.length < 3) return track;
    const firstX = values[0];
    const firstZ = values[2];
    for (let index = 0; index < values.length; index += 3) {
      values[index] = firstX;
      values[index + 1] = sharedHipY;
      values[index + 2] = firstZ;
    }
    return new VectorKeyframeTrack(track.name, [...track.times], values, track.getInterpolation());
  });
  return clip;
}

function productionState(state: HeroineLocomotionState): ProductionState {
  if (state === 'run') return 'run';
  if (state === 'walk' || state === 'jog') return 'walk';
  return 'idle';
}

/** Validated Mixamo hierarchy with controller-authoritative in-place motion. */
export function Heroine({ motion, onAnimationFrame }: HeroineProps) {
  const root = useRef<Group>(null);
  const quality = useQualityProfile();
  const base = useLoader(FBXLoader, MODEL_URL);
  const idleLibrary = useLoader(FBXLoader, IDLE_URL);
  const walkLibrary = useLoader(FBXLoader, WALK_URL);
  const runLibrary = useLoader(FBXLoader, RUN_URL);
  const textures = useTexture({
    body: `${TEXTURE_ROOT}/body-diffuse.png`,
    bodyNormal: `${TEXTURE_ROOT}/body-normal.png`,
    bodyRoughness: `${TEXTURE_ROOT}/body-roughness.png`,
    head: `${TEXTURE_ROOT}/head-diffuse.png`,
    headNormal: `${TEXTURE_ROOT}/head-normal.png`,
    headRoughness: `${TEXTURE_ROOT}/head-roughness.png`,
    hair: `${TEXTURE_ROOT}/hair-diffuse.png`,
    hairNormal: `${TEXTURE_ROOT}/hair-normal.png`,
    hairAlpha: `${TEXTURE_ROOT}/hair-alpha.png`,
    eyelashesAlpha: `${TEXTURE_ROOT}/eyelashes-alpha.png`,
  });
  const scene = useMemo(() => clone(base) as Group, [base]);
  const normalization = useMemo(() => {
    scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(scene);
    const height = bounds.getSize(new Vector3()).y;
    const scale = height > 0 ? TARGET_HEIGHT / height : 1;
    return { scale, groundOffset: -bounds.min.y * scale };
  }, [scene]);
  const mixer = useMemo(() => new AnimationMixer(scene), [scene]);
  const clips = useMemo(() => {
    const sharedHipY = hipsBaseline(idleLibrary.animations[0]);
    return {
      idle: inPlaceClip(idleLibrary.animations[0], 'idle', sharedHipY),
      walk: inPlaceClip(walkLibrary.animations[0], 'walk', sharedHipY),
      run: inPlaceClip(runLibrary.animations[0], 'run', sharedHipY),
    };
  }, [idleLibrary.animations, runLibrary.animations, walkLibrary.animations]);
  const actions = useMemo<Record<ProductionState, AnimationAction>>(() => ({
    idle: mixer.clipAction(clips.idle).setLoop(LoopRepeat, Infinity),
    walk: mixer.clipAction(clips.walk).setLoop(LoopRepeat, Infinity),
    run: mixer.clipAction(clips.run).setLoop(LoopRepeat, Infinity),
  }), [clips, mixer]);
  const activeState = useRef<ProductionState>('idle');
  const activeAction = useRef(actions.idle);

  useEffect(() => {
    textures.body.colorSpace = SRGBColorSpace;
    textures.head.colorSpace = SRGBColorSpace;
    textures.hair.colorSpace = SRGBColorSpace;
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = quality.shadows;
      object.receiveShadow = true;
      object.geometry = object.geometry.clone();
      object.geometry.clearGroups();
      CHARACTER_MATERIAL_GROUPS.forEach(({ start, count, materialIndex }) => {
        object.geometry.addGroup(start, count, materialIndex);
      });
      const body = new MeshStandardMaterial({
        name: 'body',
        map: textures.body,
        normalMap: textures.bodyNormal,
        roughnessMap: textures.bodyRoughness,
        color: new Color('#e0d2ca'),
        roughness: 0.66,
        envMapIntensity: 0.72,
      });
      const head = new MeshStandardMaterial({
        name: 'head',
        map: textures.head,
        normalMap: textures.headNormal,
        roughnessMap: textures.headRoughness,
        color: new Color('#e8b9a1'),
        roughness: 0.56,
        envMapIntensity: 0.68,
      });
      const hair = new MeshStandardMaterial({
        name: 'hair',
        map: textures.hair,
        normalMap: textures.hairNormal,
        alphaMap: textures.hairAlpha,
        transparent: true,
        alphaTest: 0.48,
        depthWrite: true,
        roughness: 0.68,
        envMapIntensity: 0.62,
        side: DoubleSide,
      });
      const eyelashes = new MeshStandardMaterial({
        name: 'eyelashes',
        color: new Color('#241813'),
        alphaMap: textures.eyelashesAlpha,
        transparent: true,
        alphaTest: 0.42,
        depthWrite: false,
        roughness: 0.8,
        side: DoubleSide,
      });
      const bodySkin = body.clone();
      bodySkin.name = 'body_skin';
      bodySkin.color.set('#e7b49a');
      bodySkin.roughness = 0.58;
      bodySkin.envMapIntensity = 0.64;
      const eyes = new MeshStandardMaterial({
        name: 'eyes',
        color: new Color('#f4eee8'),
        transparent: false,
        opacity: 1,
        depthWrite: true,
        roughness: 0.22,
        envMapIntensity: 0.8,
      });
      object.material = [body, head, hair, eyelashes, bodySkin, eyes];
    });
    actions.idle.reset().fadeIn(0.1).play();
    return () => {
      mixer.stopAllAction();
      scene.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
        object.geometry.dispose();
      });
    };
  }, [actions.idle, mixer, quality.shadows, scene, textures]);

  useFrame((_, delta) => {
    const snapshot = motion.current;
    const nextState = productionState(selectHeroineLocomotion(snapshot));
    if (nextState !== activeState.current) {
      const nextAction = actions[nextState];
      const previousAction = activeAction.current;
      const previousClip = previousAction.getClip();
      const nextClip = nextAction.getClip();
      const isLocomotionBlend = activeState.current !== 'idle' && nextState !== 'idle';
      const synchronizedTime = previousClip.duration > 0
        ? (previousAction.time % previousClip.duration) / previousClip.duration * nextClip.duration
        : 0;
      nextAction.reset().setEffectiveTimeScale(heroineAnimationTimeScale(nextState, snapshot.speed));
      if (isLocomotionBlend) {
        nextAction.fadeIn(CROSSFADE_SECONDS).play();
        nextAction.time = synchronizedTime;
        previousAction.fadeOut(CROSSFADE_SECONDS);
      } else {
        previousAction.stop();
        nextAction.play();
      }
      activeAction.current = nextAction;
      activeState.current = nextState;
    } else if (nextState !== 'idle') {
      activeAction.current.setEffectiveTimeScale(heroineAnimationTimeScale(nextState, snapshot.speed));
    }
    mixer.update(delta);
    onAnimationFrame?.();
    if (root.current) {
      root.current.visible = shouldShowHeroine(
        ownershipManager.isOwned('camera'),
        useBakeoffReviewStore.getState().active,
        useExperienceSettingsStore.getState().cameraPerspective,
      );
    }
  });

  return (
    <group ref={root} position={[0, VISUAL_CAPSULE_OFFSET, 0]} name="ModernTajVisitor">
      <group
        position={[0, normalization.groundOffset, 0]}
        rotation={[0, 0, 0]}
        scale={normalization.scale}
      >
        <primitive object={scene} />
      </group>
    </group>
  );
}

[MODEL_URL, IDLE_URL, WALK_URL, RUN_URL].forEach((url) => useLoader.preload(FBXLoader, url));
