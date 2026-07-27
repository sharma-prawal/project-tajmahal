import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { CaptureError, assertPortFree, spawnDevServer, startHeartbeat, step, waitForServer } from './capture-harness';

/**
 * Phase 10F.3 — the playtest harness: the journey walked on foot, not spawned into.
 *
 * Every prior phase photographed the journey by teleporting to each beat's
 * approach point and shooting two frames. That answers "does this composition
 * look right?" It cannot answer any of the questions this phase asks, because
 * all of them are about **what happens between the beats**, and about **what a
 * memory looks like once it is running**:
 *
 * - `capture-canonical-journey.ts` shoots its `staged` frame 2.2 s after
 *   pressing E. Every production memory opens with a camera step and two
 *   dialogue lines *before* its first `world-action`, and dialogue steps wait
 *   for input. So that frame is always taken with the memory's own props not
 *   yet spawned: no phase has ever seen a memory's staged composition with its
 *   content in it. This harness advances the dialogue and shoots each stage.
 * - Nothing has ever measured traversal. "Is the transition from Umbrella too
 *   long?" is a distance and a duration, and both were unknown.
 * - Nothing has ever walked *past* a beat. Discoverability is the question the
 *   spawn-based harness structurally cannot ask, because it always arrives
 *   inside the activation radius.
 *
 * So: real held keys, closed-loop on `__explorationTelemetry`, no `?spawn=`
 * during traversal. Distance, duration, prompts seen and prompts missed all
 * come out of the same walk the player takes.
 *
 * ## Why this one is headed
 *
 * Every other capture script in this project runs headless, which on this
 * machine means SwiftShader: measured at 8.8-12.5 **seconds** per frame. At
 * that rate a held key produces *exactly zero* movement — 382 s of held W
 * moved the player 0.0 m, with `moveForward: 1` and no ownership lease held.
 * The input layer is fine; there simply are not enough physics steps. That is
 * the mechanical reason no phase has ever measured traversal, and it is why
 * this script launches headed against Metal (27.5 fps, 19.8 m per 10 s hold).
 *
 * ## What this harness still cannot tell you
 *
 * 27.5 fps is not 60, and a desktop M-series GPU is not a phone. Frame pacing,
 * "does the climb feel long", and every question with the word *feel* in it are
 * outside its reach — it measures geometry, state, distance and time. The
 * report is explicit about which findings rest on measurement and which rest
 * on a human.
 */
const PORT = 5231;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/playtest-10f3');
const ENVIRONMENT_NOTE = 'headed Chromium / ANGLE Metal (Apple M5 Pro), 89-120 fps — desktop GPU, not device-representative; frame pacing and every "how does it feel" question are OUT OF SCOPE for this harness';

/** Walking is 2.25 m/s; a 0.6 m tolerance is under one step and inside every 6.2 m radius. */
const ARRIVAL_TOLERANCE_M = 0.6;
const SLICE_MS = 260;

interface Beat {
  order: number;
  id: string;
  productionId: string;
  label: string;
  /** Staged anchor, from bridgeLocations.ts / the memory definitions. Navigation target only. */
  anchor: readonly [number, number];
  activationRadius: number;
  /** Matches this beat's own prompt text, so a neighbour's `Replay "..."` cannot be mistaken for arrival. */
  promptPattern: RegExp;
  /**
   * Waypoints the *architecture* forces, not shortcuts.
   *
   * Two legs cannot be walked as a straight line by anyone: the entrance gate
   * is a solid building with one 9 m arch on the axis, and the platform is a
   * 3.2 m wall with one 9 m stair run at x = ±4.5. A player has to find both.
   * Encoding them here keeps the measured distance honest — it is the distance
   * the route really costs — and makes the stair mouth's own findability a
   * separate, explicit question rather than a controller artifact.
   */
  via?: readonly (readonly [number, number])[];
}

const BEATS: readonly Beat[] = [
  { order: 1, id: 'mints', promptPattern: /The Mints/, productionId: 'production.memory.mints', label: 'Mints', anchor: [-22, -65], activationRadius: 6.2, via: [[0, -33]] },
  { order: 2, id: 'boarding-passes', promptPattern: /Boarding Passes/, productionId: 'production.memory.boarding-passes', label: 'Boarding Passes', anchor: [-24, -105], activationRadius: 6.2 },
  { order: 3, id: 'little-details', promptPattern: /The Little Details/, productionId: 'production.memory.little-details', label: 'Little Details', anchor: [-20, -126], activationRadius: 6.2 },
  { order: 4, id: 'back', promptPattern: /“Back”|Back”|\bBack\b/, productionId: 'production.memory.back', label: 'Back', anchor: [-38.3, -141.5], activationRadius: 6.2 },
  { order: 5, id: 'umbrella', promptPattern: /The Umbrella/, productionId: 'production.memory.umbrella', label: 'Umbrella', anchor: [38.3, -141.5], activationRadius: 6.2 },
  { order: 6, id: 'friday-night', promptPattern: /Friday Night/, productionId: 'production.memory.friday-night', label: 'Friday Night', anchor: [18, -152], activationRadius: 6.2 },
  { order: 7, id: 'all-day-call', promptPattern: /The All-Day Call/, productionId: 'production.memory.all-day-call', label: 'All-Day Call', anchor: [-5.5, -177], activationRadius: 6.2, via: [[0, -150], [0, -167]] },
];

/** The spine volumes, for detecting completions the player never asked for. */
const SPINE: readonly { id: string; x: number; z: number; r: number }[] = [
  { id: 'm1', x: -26, z: -54.76, r: 4 },
  { id: 'm2', x: -26, z: -95.24, r: 4 },
  { id: 'm3', x: 0, z: -125, r: 22 },
  { id: 'm4', x: -35, z: -141.5, r: 5 },
  { id: 'm5', x: 35, z: -141.5, r: 4 },
  { id: 'm6', x: 0, z: -164, r: 24 },
  { id: 'm7', x: 0, z: -198.3, r: 6 },
];

interface Telemetry {
  x: number; y: number; z: number; yaw: number; grounded: boolean; activeInput: string;
}

interface RuntimeState {
  activeMemoryId: string | null;
  lifecycle: string;
  stepId: string | null;
  stepIndex: number;
  pendingInput: boolean;
  dialogueText: string | null;
  dialogueSpeaker: string | null;
  completedProduction: string[];
  completedSpine: string[];
  prompt: string | null;
  gateProgress: number;
  doorUnlocked: boolean;
  /** Asserted unchanged across the phase — 10F.3 must not alter the save shape. */
  schemaVersion: number | null;
  saveKeys: string[];
}

const problems: string[] = [];
const notes: string[] = [];

function log(message: string) {
  console.log(message);
  notes.push(message);
}

async function telemetryOf(page: Page): Promise<Telemetry> {
  const value = await page.evaluate(() => {
    const t = (window as unknown as { __explorationTelemetry?: Telemetry }).__explorationTelemetry;
    return t ? { x: t.x, y: t.y, z: t.z, yaw: t.yaw, grounded: t.grounded, activeInput: t.activeInput } : null;
  });
  if (!value) throw new CaptureError('browser-lost', '__explorationTelemetry is absent — is VITE_ENABLE_DEBUG_TOOLS set?');
  return value;
}

/**
 * Everything the player-facing and engine state say at one instant.
 *
 * The prompt is read from the DOM rather than the runtime because the DOM is
 * what the player actually sees — a focused interaction whose prompt element
 * is covered or unmounted is not a prompt.
 */
async function stateOf(page: Page): Promise<RuntimeState> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __memoryRuntime?: {
        getSnapshot: () => { activeMemoryId: string | null; lifecycle: string; stepId: string | null; stepIndex: number; pendingInput: boolean; dialogue: { speaker: string; text: string } | null };
        getCompletedIds: () => string[];
      };
    };
    const snapshot = w.__memoryRuntime?.getSnapshot() ?? null;
    const completedProduction = w.__memoryRuntime?.getCompletedIds() ?? [];
    const promptEl = document.querySelector('.interaction-prompt');
    const spineRaw = window.localStorage.getItem('project-taj:save');
    let completedSpine: string[] = [];
    let schemaVersion: number | null = null;
    let saveKeys: string[] = [];
    if (spineRaw) {
      try {
        const parsed = JSON.parse(spineRaw) as { completedMemoryIds?: string[]; schemaVersion?: number };
        completedSpine = parsed.completedMemoryIds ?? [];
        schemaVersion = parsed.schemaVersion ?? null;
        saveKeys = Object.keys(parsed).sort();
      } catch { /* a malformed save is itself a finding, reported by the caller */ }
    }
    const gateProgress = Math.max(completedSpine.length, completedProduction.length);
    return {
      activeMemoryId: snapshot?.activeMemoryId ?? null,
      lifecycle: snapshot?.lifecycle ?? 'idle',
      stepId: snapshot?.stepId ?? null,
      stepIndex: snapshot?.stepIndex ?? -1,
      pendingInput: snapshot?.pendingInput ?? false,
      dialogueText: snapshot?.dialogue?.text ?? null,
      dialogueSpeaker: snapshot?.dialogue?.speaker ?? null,
      completedProduction,
      completedSpine,
      prompt: promptEl ? (promptEl.textContent ?? '').trim() : null,
      gateProgress,
      doorUnlocked: gateProgress >= 5,
      schemaVersion,
      saveKeys,
    };
  });
}

async function shoot(page: Page, filename: string) {
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), timeout: 180_000 });
}

/** Hides only the developer panels — the interaction prompt and dialogue stay, because they are the player's. */
async function hideDebugPanels(page: Page) {
  await page.evaluate(() => {
    const keep = ['.interaction-prompt', '.memory-dialogue', '.interaction-prompt-region'];
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      if (getComputedStyle(el).position !== 'fixed') return;
      if (keep.some((selector) => el.matches(selector) || el.querySelector(selector))) return;
      if (el.querySelector('canvas')) return;
      if (el.dataset.playtestHidden === 'true') return;
      // The debug HUDs are the fixed elements holding monospace developer text.
      const text = el.textContent ?? '';
      if (/Press [A-Z] for|draw calls|shadow casters|fps:/.test(text)) {
        el.style.visibility = 'hidden';
        el.dataset.playtestHidden = 'true';
      }
    });
  });
}

async function dismissTutorial(page: Page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const skip = page.locator('button', { hasText: /^Skip$/ });
    if (await skip.count() === 0) return;
    await skip.first().click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
  }
}

/** Boots a page at the natural spawn with a clean save, tutorial dismissed. */
async function openPage(context: BrowserContext, options: { spawn?: string } = {}): Promise<Page> {
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message.split('\n')[0]}`));
  const url = options.spawn ? `${BASE_URL}?spawn=${options.spawn}` : BASE_URL;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector('#root canvas', { timeout: 90_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __explorationTelemetry?: unknown }).__explorationTelemetry), null, { timeout: 90_000 });
  await dismissTutorial(page);
  await page.waitForTimeout(2_500);
  return page;
}

interface WalkResult {
  seconds: number;
  distance: number;
  /** Straight-line distance between start and end — `distance / displacement` is the path's inefficiency. */
  displacement: number;
  arrived: boolean;
  from: readonly [number, number];
  to: readonly [number, number];
  /** Every distinct interaction prompt seen at any point along the way. */
  promptsSeen: string[];
  /** Spine memories that completed themselves during the walk. */
  spineGained: string[];
  /**
   * Distance from the target at the moment a prompt first appeared, or null if
   * the walk finished without one. This is the discoverability number: the
   * authored radius is 5.5-6.5 m, but what a player experiences is the range at
   * which the world says "there is something here".
   */
  promptOnsetDistance: number | null;
}

/**
 * Walks to a world position with held keys, closed-loop on telemetry.
 *
 * Movement is camera-relative and the camera is never rotated, so the four
 * keys stay world-axis-aligned for the whole run and a target is reachable by
 * combining at most two of them. Paths are therefore diagonal-then-axial
 * rather than optimal, and `distance` reports what was actually walked.
 */
async function walkTo(page: Page, target: readonly [number, number], label: string, options: { stopAtPromptMatching?: RegExp } = {}): Promise<WalkResult> {
  const start = await telemetryOf(page);
  const before = await stateOf(page);
  const from: readonly [number, number] = [start.x, start.z];
  let distance = 0;
  let last = { x: start.x, z: start.z };
  const promptsSeen = new Set<string>();
  let promptOnset: number | null = null;
  if (before.prompt) promptsSeen.add(before.prompt);

  const straight = Math.hypot(target[0] - start.x, target[1] - start.z);
  const budgetMs = Math.max(45_000, (straight / 1.4) * 1000 + 30_000);
  const startedAt = Date.now();
  let arrived = false;
  let held: string[] = [];

  const release = async () => {
    for (const code of held) await page.keyboard.up(code);
    held = [];
  };

  try {
    while (Date.now() - startedAt < budgetMs) {
      const t = await telemetryOf(page);
      distance += Math.hypot(t.x - last.x, t.z - last.z);
      last = { x: t.x, z: t.z };

      const dx = target[0] - t.x;
      const dz = target[1] - t.z;
      if (Math.hypot(dx, dz) <= ARRIVAL_TOLERANCE_M) { arrived = true; break; }

      // Yaw stays 0, so -Z is forward and +X is right.
      const wanted: string[] = [];
      if (Math.abs(dz) > ARRIVAL_TOLERANCE_M) wanted.push(dz < 0 ? 'KeyW' : 'KeyS');
      if (Math.abs(dx) > ARRIVAL_TOLERANCE_M) wanted.push(dx > 0 ? 'KeyD' : 'KeyA');

      for (const code of held) if (!wanted.includes(code)) await page.keyboard.up(code);
      for (const code of wanted) if (!held.includes(code)) await page.keyboard.down(code);
      held = wanted;

      await page.waitForTimeout(SLICE_MS);
      const during = await stateOf(page);
      if (during.prompt) {
        promptsSeen.add(during.prompt);
        // The prompt must be *this* beat's before it counts as arrival or as
        // an onset measurement. Stopping at any prompt looked right and was
        // badly wrong: a walk that begins inside the previous beat's completed
        // radius sees `Replay "..."` on its first sample, halts immediately,
        // and the caller then activates the memory it just finished. That
        // invalidated the first mobile and reduced-motion runs from beat 2 on.
        if (!options.stopAtPromptMatching?.test(during.prompt)) continue;
        if (promptOnset === null) promptOnset = Number(Math.hypot(dx, dz).toFixed(1));
        // A player stops when the world offers them something; they do not
        // walk on top of it. Standing *on* an anchor is also un-activatable —
        // every memory is `view-and-proximity` with a ~60 degrees cone, and at
        // zero horizontal distance the only direction to the prop is downward.
        arrived = true;
        break;
      }
    }
  } finally {
    await release();
  }

  const end = await telemetryOf(page);
  const after = await stateOf(page);
  distance += Math.hypot(end.x - last.x, end.z - last.z);
  const seconds = (Date.now() - startedAt) / 1000;
  if (!arrived) problems.push(`${label}: did not reach (${target[0]}, ${target[1]}) within ${Math.round(budgetMs / 1000)}s — stopped at (${end.x.toFixed(1)}, ${end.z.toFixed(1)})`);

  return {
    seconds: Number(seconds.toFixed(1)),
    distance: Number(distance.toFixed(1)),
    displacement: Number(straight.toFixed(1)),
    arrived,
    from,
    to: [end.x, end.z],
    promptsSeen: [...promptsSeen],
    spineGained: after.completedSpine.filter((id) => !before.completedSpine.includes(id)),
    promptOnsetDistance: promptOnset,
  };
}

/** Walks a beat's forced waypoints and then its anchor, reporting one combined leg. */
async function walkRoute(page: Page, beat: Beat, label: string): Promise<WalkResult> {
  const legs: WalkResult[] = [];
  for (const waypoint of beat.via ?? []) legs.push(await walkTo(page, waypoint, `${label} via ${waypoint.join(',')}`));
  legs.push(await walkTo(page, beat.anchor, label, { stopAtPromptMatching: beat.promptPattern }));
  const promptsSeen = new Set<string>();
  const spineGained = new Set<string>();
  for (const leg of legs) {
    leg.promptsSeen.forEach((prompt) => promptsSeen.add(prompt));
    leg.spineGained.forEach((id) => spineGained.add(id));
  }
  return {
    seconds: Number(legs.reduce((sum, leg) => sum + leg.seconds, 0).toFixed(1)),
    distance: Number(legs.reduce((sum, leg) => sum + leg.distance, 0).toFixed(1)),
    displacement: Number(Math.hypot(beat.anchor[0] - legs[0].from[0], beat.anchor[1] - legs[0].from[1]).toFixed(1)),
    arrived: legs.every((leg) => leg.arrived),
    from: legs[0].from,
    to: legs[legs.length - 1].to,
    promptsSeen: [...promptsSeen],
    spineGained: [...spineGained],
    promptOnsetDistance: legs[legs.length - 1].promptOnsetDistance,
  };
}

interface BeatResult {
  beat: string;
  order: number;
  approachPrompt: string | null;
  /** Distance from the anchor at the moment the prompt first appeared. */
  promptFirstSeenAtDistance: number | null;
  activated: boolean;
  dialogueSeconds: number;
  dialogueLines: number;
  stageFrames: string[];
  completed: boolean;
  /** Prompts visible at the same time as this beat's own — an overlap the player must disambiguate. */
  overlappingPrompts: string[];
  spineGainedDuring: string[];
  gateProgressAfter: number;
  doorUnlockedAfter: boolean;
  cameraReleaseYaw: number | null;
  errors: string[];
}

/**
 * Plays one memory all the way through, photographing every world-action stage.
 *
 * `acknowledge()` is driven with the real E key rather than the runtime method,
 * so the input path the player uses is the one under test.
 */
async function playBeat(page: Page, beat: Beat, prefix: string, options: { captureStages?: boolean; cancelAtLine?: number } = {}): Promise<BeatResult> {
  const errors: string[] = [];
  const before = await stateOf(page);
  const stageFrames: string[] = [];
  const overlapping: string[] = [];

  await hideDebugPanels(page);
  const approach = await stateOf(page);
  if (!approach.prompt) errors.push('no interaction prompt at the staged anchor');
  await shoot(page, `${prefix}-a-approach.png`);

  const onset = await page.evaluate(() => document.querySelectorAll('.interaction-prompt').length);
  if (onset > 1) overlapping.push(`${onset} simultaneous interaction prompts`);

  const dialogueStartedAt = Date.now();
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1_800);

  let activated = (await stateOf(page)).activeMemoryId === beat.productionId;
  if (!activated) {
    // One retry: the press can land in the frame the prompt is being published.
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(1_800);
    activated = (await stateOf(page)).activeMemoryId === beat.productionId;
  }
  if (!activated) errors.push(`E did not activate ${beat.productionId}`);

  // The authored camera composition, at the moment control is taken.
  await hideDebugPanels(page);
  await shoot(page, `${prefix}-b-camera-settled.png`);

  let lines = 0;
  let stage = 0;
  let lastStepId: string | null = null;
  const seenStageIds = new Set<string>();
  const guard = Date.now();
  while (Date.now() - guard < 240_000) {
    const state = await stateOf(page);
    // Completion is the end of the memory, not `activeMemoryId` going null:
    // the runtime keeps the id in its snapshot after a `complete` step, so
    // watching only that ran every finished memory out to the full guard and
    // made `dialogueSeconds` meaningless (four beats all reported 242 s).
    if (state.completedProduction.includes(beat.productionId)) break;
    if (state.activeMemoryId !== beat.productionId && lines > 0) break;
    if (state.activeMemoryId !== beat.productionId && !activated) break;

    if (state.stepId && state.stepId !== lastStepId) {
      lastStepId = state.stepId;
      if (state.dialogueText) lines += 1;
      // A world-action step is where the memory's own props change; photograph each once.
      if (options.captureStages !== false && /stage|clear|world|arrangement|enclosure|cadence|reveal|accept|shelter|detail/i.test(state.stepId) && !seenStageIds.has(state.stepId)) {
        seenStageIds.add(state.stepId);
        stage += 1;
        await page.waitForTimeout(900);
        await hideDebugPanels(page);
        const filename = `${prefix}-c${stage}-${state.stepId.slice(0, 34)}.png`;
        await shoot(page, filename);
        stageFrames.push(filename);
      }
    }

    if (options.cancelAtLine !== undefined && lines >= options.cancelAtLine) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1_500);
      break;
    }

    if (state.pendingInput) {
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(500);
    } else {
      await page.waitForTimeout(400);
    }
  }

  const dialogueSeconds = Number(((Date.now() - dialogueStartedAt) / 1000).toFixed(1));
  await page.waitForTimeout(2_000);
  await hideDebugPanels(page);
  await shoot(page, `${prefix}-d-control-returned.png`);

  const after = await stateOf(page);
  const releaseTelemetry = await telemetryOf(page);
  const completed = after.completedProduction.includes(beat.productionId);
  if (options.cancelAtLine === undefined && !completed) errors.push('memory did not reach completion');

  return {
    beat: beat.id,
    order: beat.order,
    approachPrompt: approach.prompt,
    promptFirstSeenAtDistance: null,
    activated,
    dialogueSeconds,
    dialogueLines: lines,
    stageFrames,
    completed,
    overlappingPrompts: overlapping,
    spineGainedDuring: after.completedSpine.filter((id) => !before.completedSpine.includes(id)),
    gateProgressAfter: after.gateProgress,
    doorUnlockedAfter: after.doorUnlocked,
    cameraReleaseYaw: Number(releaseTelemetry.yaw.toFixed(2)),
    errors,
  };
}

function spineContaining(x: number, z: number): string[] {
  return SPINE.filter((volume) => Math.hypot(volume.x - x, volume.z - z) <= volume.r).map((volume) => volume.id);
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

interface RunReport {
  id: string;
  title: string;
  outcome: 'completed-clean' | 'completed-with-problems' | 'failed';
  metrics: Record<string, unknown>;
  problems: string[];
}

const runs: RunReport[] = [];

/**
 * Records a finished run and writes it to disk immediately.
 *
 * Not at the end of `main()`: the first attempt did that, a later run lost its
 * dev server, the `browser-lost` error skipped every write, and a completed
 * 12-minute measurement went with it. A run's numbers exist as soon as the run
 * does.
 */
async function record(report: RunReport): Promise<void> {
  runs.push(report);
  await writeFile(
    path.join(OUTPUT_DIR, `playtest-report-${report.id}.json`),
    `${JSON.stringify({ measuredAt: new Date().toISOString(), environment: ENVIRONMENT_NOTE, ...report }, null, 2)}\n`,
  );
}

/**
 * R1 — the discoverability run.
 *
 * Walks the axis a first-time player is told to walk ("follow the water", a
 * white path, the Taj framed in the gate) and records which beats prompt and
 * which are silently passed. No beat anchor is used to steer.
 */
async function runFirstTimeAxis(context: BrowserContext) {
  const page = await openPage(context);
  const local: string[] = [];
  const promptsSeen = new Set<string>();
  const passedBy: { beat: string; closestApproach: number }[] = BEATS.map((beat) => ({ beat: beat.id, closestApproach: Infinity }));
  await hideDebugPanels(page);
  await shoot(page, 'r1-00-spawn.png');

  const start = await telemetryOf(page);
  local.push(`spawn at (${start.x.toFixed(1)}, ${start.z.toFixed(1)}), yaw ${start.yaw.toFixed(2)}`);

  // Straight up the central walk, sampling as we go. Stops at the platform foot.
  let distance = 0;
  let last = { x: start.x, z: start.z };
  const startedAt = Date.now();
  await page.keyboard.down('KeyW');
  try {
    while (Date.now() - startedAt < 300_000) {
      await page.waitForTimeout(SLICE_MS);
      const t = await telemetryOf(page);
      distance += Math.hypot(t.x - last.x, t.z - last.z);
      last = { x: t.x, z: t.z };
      for (const entry of passedBy) {
        const beat = BEATS.find((candidate) => candidate.id === entry.beat)!;
        entry.closestApproach = Math.min(entry.closestApproach, Math.hypot(beat.anchor[0] - t.x, beat.anchor[1] - t.z));
      }
      const state = await stateOf(page);
      if (state.prompt) promptsSeen.add(`${state.prompt} @ z=${t.z.toFixed(0)}`);
      if (t.z <= -154) break;
    }
  } finally {
    await page.keyboard.up('KeyW');
  }
  const end = await telemetryOf(page);
  await hideDebugPanels(page);
  await shoot(page, 'r1-01-platform-foot.png');

  const missed = passedBy.filter((entry) => entry.closestApproach > 6.2);
  local.push(`walked ${distance.toFixed(0)} m up the axis in ${((Date.now() - startedAt) / 1000).toFixed(0)}s, ending at (${end.x.toFixed(1)}, ${end.z.toFixed(1)})`);
  local.push(`prompts seen: ${promptsSeen.size ? [...promptsSeen].join(' | ') : 'NONE'}`);
  local.push(`beats never entered: ${missed.map((entry) => `${entry.beat} (closest ${entry.closestApproach.toFixed(0)} m)`).join(', ') || 'none'}`);

  await record({
    id: 'r1-first-time-axis',
    title: 'First-time exploratory run — the central axis, unguided',
    outcome: missed.length ? 'completed-with-problems' : 'completed-clean',
    metrics: { distanceM: Number(distance.toFixed(1)), seconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)), promptsSeen: [...promptsSeen], closestApproach: passedBy, endedAt: [end.x, end.z] },
    problems: missed.map((entry) => `${entry.beat} was never entered on the axis walk (closest approach ${entry.closestApproach.toFixed(1)} m, radius 6.2 m)`),
  });
  local.forEach(log);
  await page.close();
}

/** R2 — the canonical order, walked beat to beat, everything measured. */
async function runCanonical(context: BrowserContext, id: string, title: string, options: { prefix: string; reducedMotion?: boolean } ) {
  const page = await openPage(context);
  if (options.reducedMotion) {
    await page.evaluate(() => {
      const store = (window as unknown as { __accessibility?: { setReducedMotion: (v: boolean) => void } }).__accessibility;
      store?.setReducedMotion(true);
    });
  }
  const walks: Record<string, WalkResult> = {};
  const beats: BeatResult[] = [];
  const local: string[] = [];
  let unlockedAt: string | null = null;

  for (const beat of BEATS) {
    const walk = await step(`${id} walk to ${beat.id}`, 300_000, () => walkRoute(page, beat, `${id}/${beat.id}`));
    walks[beat.id] = walk;
    const inside = spineContaining(walk.to[0], walk.to[1]);
    local.push(`${id} ${beat.order} ${beat.id}: walked ${walk.distance} m (straight ${walk.displacement} m) in ${walk.seconds}s; standing inside spine volumes [${inside.join(', ') || 'none'}]`);

    const result = await step(`${id} play ${beat.id}`, 420_000, () => playBeat(page, beat, `${options.prefix}-${String(beat.order).padStart(2, '0')}-${beat.id}`));
    result.promptFirstSeenAtDistance = walk.promptOnsetDistance;
    beats.push(result);
    if (result.doorUnlockedAfter && !unlockedAt) {
      unlockedAt = beat.id;
      local.push(`*** the mausoleum gate reached 5 of 7 at beat ${beat.order} (${beat.id}), with ${7 - beat.order} beats still unplayed ***`);
    }
    result.errors.forEach((error) => problems.push(`${id}/${beat.id}: ${error}`));
  }

  // The handoff the phase asks about, measured on its own: Friday Night's
  // completion point to All-Day Call's activation point, over the stairs.
  const stairWalk = walks['all-day-call'];
  local.push(`stair handoff: ${stairWalk.distance} m of climb in ${stairWalk.seconds}s`);

  // And the final approach to the threshold.
  const doorWalk = await step(`${id} approach m7`, 300_000, () => walkTo(page, [0, -190], `${id}/m7`));
  await hideDebugPanels(page);
  await shoot(page, `${options.prefix}-08-m7-approach.png`);
  const atDoor = await stateOf(page);
  local.push(`m7 approach: ${doorWalk.distance} m; prompt at threshold: ${atDoor.prompt ?? 'NONE'}; gate ${atDoor.gateProgress}/5, door ${atDoor.doorUnlocked ? 'open' : 'shut'}`);

  // Can the player actually go in? Push north into the door for 12 s and see.
  const beforePush = await telemetryOf(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(12_000);
  await page.keyboard.up('KeyW');
  const afterPush = await telemetryOf(page);
  const entered = afterPush.z < beforePush.z - 1;
  local.push(`entry attempt: z ${beforePush.z.toFixed(1)} -> ${afterPush.z.toFixed(1)} (${entered ? 'moved north' : 'BLOCKED'})`);
  await hideDebugPanels(page);
  await shoot(page, `${options.prefix}-09-m7-entry-attempt.png`);

  const total = Object.values(walks).reduce((sum, walk) => sum + walk.distance, 0) + doorWalk.distance;
  const traversalSeconds = Object.values(walks).reduce((sum, walk) => sum + walk.seconds, 0) + doorWalk.seconds;
  const dialogueSeconds = beats.reduce((sum, beat) => sum + beat.dialogueSeconds, 0);

  await record({
    id,
    title,
    outcome: problems.some((problem) => problem.startsWith(`${id}/`)) ? 'completed-with-problems' : 'completed-clean',
    metrics: {
      totalDistanceM: Number(total.toFixed(1)),
      traversalSeconds: Number(traversalSeconds.toFixed(1)),
      dialogueSeconds: Number(dialogueSeconds.toFixed(1)),
      walks, beats,
      gateReached5AtBeat: unlockedAt,
      m7Prompt: atDoor.prompt,
      m7EntryPossible: entered,
      finalGateProgress: atDoor.gateProgress,
    },
    problems: problems.filter((problem) => problem.startsWith(`${id}/`)),
  });
  local.forEach(log);
  await page.close();
}

/** R3 — the reverse route: the culmination first, the opening last. */
async function runReverse(context: BrowserContext) {
  const page = await openPage(context, { spawn: '0,5.4,-170' });
  const local: string[] = [];
  const order = [...BEATS].reverse();
  const beats: BeatResult[] = [];
  let unlockedAt: string | null = null;
  for (const beat of order) {
    await step(`r3 walk to ${beat.id}`, 300_000, () => walkRoute(page, beat, `r3/${beat.id}`));
    const result = await step(`r3 play ${beat.id}`, 420_000, () => playBeat(page, beat, `r3-${String(8 - beat.order).padStart(2, '0')}-${beat.id}`, { captureStages: false }));
    beats.push(result);
    if (result.doorUnlockedAfter && !unlockedAt) unlockedAt = beat.id;
    result.errors.forEach((error) => problems.push(`r3/${beat.id}: ${error}`));
  }
  local.push(`r3 reverse: gate reached 5 of 7 at ${unlockedAt} (${order.findIndex((beat) => beat.id === unlockedAt) + 1} beats in)`);
  await record({
    id: 'r3-reverse-order',
    title: 'Deliberately out-of-order run — the canonical route reversed',
    outcome: problems.some((problem) => problem.startsWith('r3/')) ? 'completed-with-problems' : 'completed-clean',
    metrics: { beats, gateReached5AtBeat: unlockedAt },
    problems: problems.filter((problem) => problem.startsWith('r3/')),
  });
  local.forEach(log);
  await page.close();
}

/** R6 — reload after each completed memory; the save must bring the world back as it was. */
async function runReloadPerBeat(context: BrowserContext) {
  const local: string[] = [];
  const page = await openPage(context);
  const rows: { beat: string; completedBefore: number; completedAfterReload: number; spineBefore: number; spineAfterReload: number; ok: boolean }[] = [];
  for (const beat of BEATS) {
    await step(`r6 walk to ${beat.id}`, 300_000, () => walkRoute(page, beat, `r6/${beat.id}`));
    await step(`r6 play ${beat.id}`, 420_000, () => playBeat(page, beat, `r6-${beat.id}`, { captureStages: false }));
    const before = await stateOf(page);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForSelector('#root canvas', { timeout: 90_000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __explorationTelemetry?: unknown }).__explorationTelemetry), null, { timeout: 90_000 });
    await dismissTutorial(page);
    await page.waitForTimeout(4_000);
    const after = await stateOf(page);
    const ok = after.completedProduction.length === before.completedProduction.length && after.completedSpine.length === before.completedSpine.length;
    rows.push({
      beat: beat.id,
      completedBefore: before.completedProduction.length,
      completedAfterReload: after.completedProduction.length,
      spineBefore: before.completedSpine.length,
      spineAfterReload: after.completedSpine.length,
      ok,
    });
    if (!ok) problems.push(`r6/${beat.id}: reload lost progress (production ${before.completedProduction.length}->${after.completedProduction.length}, spine ${before.completedSpine.length}->${after.completedSpine.length})`);
    local.push(`r6 ${beat.id}: reload restored ${after.completedProduction.length} narratives / ${after.completedSpine.length} landmarks — ${ok ? 'ok' : 'LOST'}`);
  }
  await record({
    id: 'r6-reload-per-beat',
    title: 'Reload after each completed memory',
    outcome: rows.every((row) => row.ok) ? 'completed-clean' : 'completed-with-problems',
    metrics: { rows },
    problems: problems.filter((problem) => problem.startsWith('r6/')),
  });
  local.forEach(log);
  await page.close();
}

/** R7 — walk in, start a memory, step away mid-sentence, come back. */
async function runCancellation(context: BrowserContext) {
  const page = await openPage(context);
  const local: string[] = [];
  const rows: { beat: string; cancelledCleanly: boolean; promptReturned: boolean; replayable: boolean }[] = [];
  for (const beat of BEATS) {
    await step(`r7 walk to ${beat.id}`, 300_000, () => walkRoute(page, beat, `r7/${beat.id}`));
    await step(`r7 cancel ${beat.id}`, 300_000, () => playBeat(page, beat, `r7-${beat.id}`, { captureStages: false, cancelAtLine: 2 }));
    await page.waitForTimeout(2_500);
    const afterCancel = await stateOf(page);
    const cancelledCleanly = afterCancel.activeMemoryId === null && !afterCancel.completedProduction.includes(beat.productionId);
    const promptReturned = Boolean(afterCancel.prompt);
    // Replay it properly.
    const replay = await step(`r7 replay ${beat.id}`, 420_000, () => playBeat(page, beat, `r7-${beat.id}-replay`, { captureStages: false }));
    rows.push({ beat: beat.id, cancelledCleanly, promptReturned, replayable: replay.completed });
    if (!cancelledCleanly) problems.push(`r7/${beat.id}: Escape left the runtime in ${afterCancel.lifecycle} with active=${afterCancel.activeMemoryId}`);
    if (!promptReturned) problems.push(`r7/${beat.id}: no prompt after cancelling — the memory cannot be restarted from where the player stands`);
    if (!replay.completed) problems.push(`r7/${beat.id}: could not complete after a cancellation`);
    local.push(`r7 ${beat.id}: cancel ${cancelledCleanly ? 'clean' : 'DIRTY'}, prompt ${promptReturned ? 'returned' : 'GONE'}, replay ${replay.completed ? 'ok' : 'FAILED'}`);
  }
  await record({
    id: 'r7-cancellation',
    title: 'Cancellation and interruption run',
    outcome: rows.every((row) => row.cancelledCleanly && row.promptReturned && row.replayable) ? 'completed-clean' : 'completed-with-problems',
    metrics: { rows },
    problems: problems.filter((problem) => problem.startsWith('r7/')),
  });
  local.forEach(log);
  await page.close();
}

/** R8 — five memories, then straight to the door, skipping the finale. */
async function runFiveOfSeven(context: BrowserContext) {
  const page = await openPage(context);
  const local: string[] = [];
  const first5 = BEATS.slice(0, 5);
  for (const beat of first5) {
    await step(`r8 walk to ${beat.id}`, 300_000, () => walkRoute(page, beat, `r8/${beat.id}`));
    await step(`r8 play ${beat.id}`, 420_000, () => playBeat(page, beat, `r8-${beat.id}`, { captureStages: false }));
  }
  const afterFive = await stateOf(page);
  local.push(`r8 after five narratives: gate ${afterFive.gateProgress}, door ${afterFive.doorUnlocked ? 'OPEN' : 'shut'}, spine [${afterFive.completedSpine.join(', ')}]`);

  const walkToDoor = await step('r8 walk to m7', 400_000, () => walkTo(page, [0, -190], 'r8/m7'));
  await hideDebugPanels(page);
  await shoot(page, 'r8-m7-early-unlock.png');
  const atDoor = await stateOf(page);
  local.push(`r8 door approach: ${walkToDoor.distance} m in ${walkToDoor.seconds}s; prompt "${atDoor.prompt ?? 'NONE'}"; Friday Night and All-Day Call never played`);

  await record({
    id: 'r8-five-of-seven',
    title: 'Five-of-seven early mausoleum unlock',
    outcome: 'completed-clean',
    metrics: {
      gateAfterFive: afterFive.gateProgress,
      doorOpenAfterFive: afterFive.doorUnlocked,
      spineAfterFive: afterFive.completedSpine,
      productionAfterFive: afterFive.completedProduction,
      secondsFromFifthCompletionToDoor: walkToDoor.seconds,
      metresFromFifthCompletionToDoor: walkToDoor.distance,
      promptAtDoor: atDoor.prompt,
    },
    problems: [],
  });
  local.forEach(log);
  await page.close();
}

// ---------------------------------------------------------------------------

async function main() {
  const only = process.argv.slice(2).filter((argument) => !argument.startsWith('-'));
  const wanted = (id: string) => only.length === 0 || only.includes(id);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await assertPortFree(PORT);
  const stopHeartbeat = startHeartbeat('playtest-10f3');
  let browser: Browser | undefined;
  let serverExited: number | null | undefined;
  const server = spawnDevServer(PORT, (code) => { serverExited = code; });

  try {
    await step('dev server boot', 150_000, () => waitForServer(BASE_URL));
    // Headed + Metal, and with the throttles that would otherwise stop rAF the
    // moment the window is occluded — a suspended rAF looks exactly like a
    // stalled run, which is the failure mode `capture-harness` exists to name.
    browser = await chromium.launch({
      headless: false,
      args: [
        '--use-angle=metal',
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
      ],
    });
    const fresh = async (options: Parameters<Browser['newContext']>[0] = {}) => {
      const context = await browser!.newContext({ viewport: { width: 1440, height: 900 }, ...options });
      await context.addInitScript(() => {
        // `addInitScript` runs before every navigation, including reloads.
        // Clean each fresh context once, then preserve storage so R6 can
        // actually exercise the production save/load path.
        const cleanFlag = 'project-taj:playtest-context-clean';
        if (sessionStorage.getItem(cleanFlag) !== '1') {
          localStorage.removeItem('project-taj:save');
          localStorage.removeItem('project-taj:experience-settings');
          sessionStorage.setItem(cleanFlag, '1');
        }
      });
      return context;
    };
    const guard = () => { if (serverExited !== undefined) throw new CaptureError('browser-lost', `dev server exited (${serverExited})`); };

    if (wanted('r1')) { guard(); const context = await fresh(); await step('R1 first-time axis', 600_000, () => runFirstTimeAxis(context)); await context.close(); }
    if (wanted('r2')) { guard(); const context = await fresh(); await step('R2 canonical desktop', 2_400_000, () => runCanonical(context, 'r2-canonical-desktop', 'Direct canonical-order desktop run', { prefix: 'r2' })); await context.close(); }
    if (wanted('r3')) { guard(); const context = await fresh(); await step('R3 reverse', 2_400_000, () => runReverse(context)); await context.close(); }
    if (wanted('r4')) {
      guard();
      const context = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      await step('R4 mobile canonical', 2_400_000, () => runCanonical(context, 'r4-canonical-mobile', 'Mobile-profile canonical run', { prefix: 'r4' }));
      await context.close();
    }
    if (wanted('r5')) {
      guard();
      const context = await fresh({ reducedMotion: 'reduce' });
      await step('R5 reduced motion canonical', 2_400_000, () => runCanonical(context, 'r5-canonical-reduced-motion', 'Reduced-motion canonical run', { prefix: 'r5', reducedMotion: true }));
      await context.close();
    }
    if (wanted('r6')) { guard(); const context = await fresh(); await step('R6 reload per beat', 2_400_000, () => runReloadPerBeat(context)); await context.close(); }
    if (wanted('r7')) { guard(); const context = await fresh(); await step('R7 cancellation', 2_400_000, () => runCancellation(context)); await context.close(); }
    if (wanted('r8')) { guard(); const context = await fresh(); await step('R8 five of seven', 2_400_000, () => runFiveOfSeven(context)); await context.close(); }

    const outcome = problems.length ? 'completed-with-problems' : 'completed-clean';
    await writeFile(
      path.join(OUTPUT_DIR, 'playtest-report.json'),
      `${JSON.stringify({
        measuredAt: new Date().toISOString(),
        environment: ENVIRONMENT_NOTE,
        outcome,
        runs,
        problems,
        notes,
      }, null, 2)}\n`,
    );
    console.log(`\n=== playtest-10f3: ${outcome} — ${problems.length} problem(s) ===`);
    problems.forEach((problem) => console.log(`  ! ${problem}`));
  } finally {
    stopHeartbeat();
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error instanceof CaptureError ? error.message : error);
  process.exitCode = 1;
});
