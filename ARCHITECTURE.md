# Architecture

## Runtime Composition

`main.tsx` mounts the eager DOM application in `App.tsx`. The Three.js and
Rapier experience is lazy-loaded from `Experience.tsx` so the loading shell and
settings remain responsive while the 3D runtime downloads.

```text
App
|- UI, loading, settings, journal, final letter
|- save, audio, and interruption hooks
`- Experience (lazy)
   |- CanvasRoot + Rapier Physics
   |- Environment
   |- PlayerController + CameraController
   |- interaction and memory runtimes
   `- narrative progression and finale adapters
```

## Ownership Boundaries

- `src/core/`: renderer, camera, audio, interaction, save, recovery, lighting,
  performance, and memory-runtime coordination.
- `src/player/`: capsule motor, input adapters, grounding, heroine model and
  animation, checkpoints, and out-of-bounds recovery.
- `src/narrative/`: spatial memory ledger, production-memory mapping,
  progression, sunset, landmarks, and finale.
- `src/components/`: visible environment and DOM interface.
- `src/content/`: authored narrative copy consumed by runtime systems.
- `src/state/`: small UI/accessibility Zustand stores.
- `scripts/`: capture, benchmark, narration, and content-validation tooling.

## Traversal

The player is a dynamic Rapier capsule with locked rotation. Input is sampled
into refs, movement is authored during fixed physics steps, and presentation is
updated per render frame. Grounding uses a downward sphere cast with a walkable
ray fallback for stair edges. Modal or narrative ownership immediately zeros
horizontal velocity.

The Taj uses lateral authored stair flights backed by hidden ramp colliders.
They unlock after six completed memories. The exterior landing is traversable;
a permanent collider at the visible main doors prevents entry into the Taj.

## Narrative And Save State

Two intentional seven-item ledgers exist:

- spatial memories represent places in the garden;
- production memories represent authored narrative sequences.

Progress uses the greater completed count rather than unioning unlike IDs.
Five memories open the visible doors, six unlock the exterior stair approach,
and seven unlock the final letter. Save schema v3 persists both ledgers,
interaction state, runtime flags/checkpoints, accessibility settings, and the
last grounded player checkpoint.

`OwnershipManager` arbitrates traversal, camera, interaction, narrative input,
and modal UI. Every memory sequence acquires and releases these resources
through `MemoryRuntime`.

## Asset Delivery

Everything under `public/` is copied verbatim by Vite. Runtime code therefore
references only production assets in `public/assets/`; rejected candidates,
raw source maps, and review captures are excluded. Long audio beds stream,
short cues decode on demand, and narration is generated offline with Kokoro
then checked in as mastered Opus/Ogg assets.

Source and licence evidence that must remain reproducible lives under
`content/`. Generated captures belong under ignored `artifacts/review/`; the
small curated release set remains under `artifacts/release-candidate/`.

## Debugging And Validation

Debug tools are gated by `VITE_ENABLE_DEBUG_TOOLS`. They include performance,
traversal, interaction, lighting, water, atmosphere, audio, and code-authored
Taj review modes. They do not require alternate production models.

The release gates are:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm content:lint
pnpm lint
```

Browser regression checks cover loading, movement ownership, camera controls,
stair traversal, memory interactions, and finale behavior.
