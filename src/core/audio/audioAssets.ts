import type { FootstepSurface } from './audioPolicy';

const ROOT = '/assets/audio';

export const AUDIO_ASSETS = {
  ambience: {
    garden: `${ROOT}/ambience/garden-bed.ogg`,
    wind: `${ROOT}/ambience/garden-wind.ogg`,
    fountain: `${ROOT}/ambience/fountain-loop.ogg`,
    interior: `${ROOT}/ambience/interior-roomtone.ogg`,
    leaves: `${ROOT}/ambience/leaves-rustle.ogg`,
  },
  music: {
    romantic: `${ROOT}/music/contemplative-romantic-piano.mp3`,
  },
  ui: {
    hover: `${ROOT}/ui/hover.ogg`,
    confirm: `${ROOT}/ui/confirm.ogg`,
    cancel: `${ROOT}/ui/cancel.ogg`,
  },
  interaction: {
    confirm: `${ROOT}/interactions/focus-confirm.ogg`,
    chirag: `${ROOT}/interactions/chirag-ignite.ogg`,
  },
  memory: {
    activate: `${ROOT}/memories/activate.ogg`,
    complete: `${ROOT}/memories/complete.ogg`,
    'production.memory.all-day-call': `${ROOT}/memories/all-day-call.ogg`,
    'production.memory.back': `${ROOT}/memories/back.ogg`,
    'production.memory.boarding-passes': `${ROOT}/memories/boarding-passes.ogg`,
    'production.memory.mints': `${ROOT}/memories/mints.ogg`,
    'production.memory.umbrella': `${ROOT}/memories/umbrella.ogg`,
    'production.memory.little-details': `${ROOT}/memories/little-details.ogg`,
    'production.memory.friday-night': `${ROOT}/memories/friday-night.ogg`,
  },
  finale: {
    door: `${ROOT}/finale/mausoleum-door-open.ogg`,
    letter: `${ROOT}/finale/letter-unfold.ogg`,
  },
  transition: {
    open: `${ROOT}/transitions/soft-open.ogg`,
    close: `${ROOT}/transitions/soft-close.ogg`,
  },
} as const;

export const NARRATION_ASSETS = {
  tutorial: (scheme: 'desktop' | 'touch', step: number) =>
    `${ROOT}/narration/tutorial/${scheme}-${step}.mp3`,
  welcome: (step: number) => `${ROOT}/narration/welcome/${step}.mp3`,
  memory: (memoryId: string, stepId: string) =>
    `${ROOT}/narration/memories/${memoryId.replace(/^production\.memory\./, '')}/${stepId}.mp3`,
  finalLetter: `${ROOT}/narration/finale/final-letter.mp3`,
} as const;

const STEP_SURFACES = ['grass', 'marble', 'stone', 'sand', 'wood'] as const;

const FOOTSTEP_ASSETS_BY_MATERIAL = Object.fromEntries(
  STEP_SURFACES.map((surface) => [
    surface,
    Array.from({ length: 4 }, (_, index) => `${ROOT}/footsteps/${surface}/step-${index + 1}.ogg`),
  ]),
) as Record<(typeof STEP_SURFACES)[number], string[]>;

export const FOOTSTEP_ASSETS: Record<FootstepSurface, string[]> = {
  ...FOOTSTEP_ASSETS_BY_MATERIAL,
  stairs: FOOTSTEP_ASSETS_BY_MATERIAL.stone,
};

export type MemoryAudioId = keyof typeof AUDIO_ASSETS.memory;
