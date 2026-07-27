import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5204;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.resolve('artifacts/review/audio');
type Diagnostics = {
  lifecycle: string; muted: boolean; activeVoices: number; voiceLimit: number;
  ambienceActive: boolean; musicActive: boolean; memoryActive: boolean; footstepCount: number;
  footstepSurface: string; fountainGain: number; worldZone: string;
  decodedBuffers: number; masterVolume: number; ambienceVolume: number;
  effectsVolume: number; locomotionSpeed: number; locomotionGrounded: boolean;
};
type BrowserAudioManager = {
  init: () => boolean;
  resume: () => Promise<void>;
  suspend: () => Promise<void>;
  setVolumes: (values: { master: number; ambience: number; effects: number }) => void;
  setMuted: (muted: boolean) => void;
  setMemoryActive: (active: boolean, memoryId?: string | null) => void;
  updateSpatialState: (x: number, z: number, fountainZ: readonly number[]) => void;
  updateLocomotion: (input: { speed: number; running: boolean; grounded: boolean; enabled: boolean; nowSeconds: number }) => void;
  inspectDiagnostics: () => Diagnostics;
};
type AudioWindow = typeof window & {
  __audioHarnessManager?: BrowserAudioManager;
  __audioDiagnostics?: () => Diagnostics;
};

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    try { if ((await fetch(BASE_URL)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Audio capture server did not start');
}

async function diagnostics(page: Page): Promise<Diagnostics> {
  return page.evaluate(() => (window as AudioWindow).__audioDiagnostics!());
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  const errors: string[] = [];
  const report: Record<string, unknown> = {};
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' },
      stdio: 'pipe',
    });
    await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.mouse.click(20, 20);

    await page.evaluate(async () => {
      const loadModule = new Function('return import("/src/core/audio/AudioManager.ts")') as () => Promise<{ audioManager: BrowserAudioManager }>;
      const { audioManager } = await loadModule();
      audioManager.init();
      await audioManager.resume();
      audioManager.setVolumes({ master: 0.55, ambience: 0.35, effects: 0.6 });
      (window as AudioWindow).__audioHarnessManager = audioManager;
      (window as AudioWindow).__audioDiagnostics = audioManager.inspectDiagnostics;
    });
    await page.waitForTimeout(800);
    report.unlocked = await diagnostics(page);
    if ((report.unlocked as Diagnostics).lifecycle !== 'running' ||
        !(report.unlocked as Diagnostics).ambienceActive ||
        !(report.unlocked as Diagnostics).musicActive) {
      throw new Error(`Audio did not unlock into active ambience and music: ${JSON.stringify(report.unlocked)}`);
    }

    const beforeWalk = (await diagnostics(page)).footstepCount;
    await page.evaluate(() => {
      const manager = (window as AudioWindow).__audioHarnessManager!;
      manager.updateSpatialState(-22, -60.5, [-52, -98]);
      for (let index = 0; index < 6; index += 1) {
        manager.updateLocomotion({ speed: 2, running: false, grounded: true, enabled: true, nowSeconds: index });
      }
      manager.updateLocomotion({ speed: 0, running: false, grounded: true, enabled: true, nowSeconds: 7 });
    });
    await page.waitForTimeout(600);
    const moving = await diagnostics(page);
    if (moving.footstepCount <= beforeWalk || moving.footstepSurface !== 'grass') {
      throw new Error(`Surface traversal audio failed: ${JSON.stringify(moving)}`);
    }
    const stationary = (await diagnostics(page)).footstepCount;
    await page.waitForTimeout(500);
    if ((await diagnostics(page)).footstepCount !== stationary) throw new Error('Stationary player produced footsteps');
    report.footsteps = { beforeWalk, afterWalk: moving.footstepCount, stationary, moving };

    await page.evaluate(() => (window as AudioWindow).__audioHarnessManager!.setMemoryActive(true, 'production.memory.mints'));
    await page.waitForTimeout(300);
    report.memoryActive = await diagnostics(page);
    if (!(report.memoryActive as Diagnostics).memoryActive) throw new Error('Memory duck did not activate');
    await page.evaluate(() => (window as AudioWindow).__audioHarnessManager!.setMemoryActive(false));

    await page.evaluate(() => (window as AudioWindow).__audioHarnessManager!.suspend());
    report.suspended = await diagnostics(page);
    await page.evaluate(() => (window as AudioWindow).__audioHarnessManager!.resume());
    report.resumed = await diagnostics(page);
    if ((report.suspended as Diagnostics).lifecycle !== 'suspended' || (report.resumed as Diagnostics).lifecycle !== 'running') {
      throw new Error('Suspend/resume lifecycle failed');
    }

    const nearGain = moving.fountainGain;
    await page.evaluate(() => (window as AudioWindow).__audioHarnessManager!.updateSpatialState(0, -6, [-52, -98]));
    report.far = await diagnostics(page);
    if ((report.far as Diagnostics).fountainGain >= nearGain) {
      throw new Error(`Fountain did not attenuate: near=${nearGain} far=${(report.far as Diagnostics).fountainGain}`);
    }

    await page.evaluate(() => (window as AudioWindow).__audioHarnessManager!.setMuted(true));
    report.muted = await diagnostics(page);
    if (!(report.muted as Diagnostics).muted) throw new Error('Mute did not reach audio manager');
    if (errors.length) throw new Error(`Browser page errors:\n${errors.join('\n')}`);
    await writeFile(path.join(OUTPUT_DIR, 'audio-validation.json'), JSON.stringify(report, null, 2));
    console.log(`Generated audio validation JSON in ${OUTPUT_DIR}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
