import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';

/**
 * Phase 10E.1 — shared capture-run scaffolding with **explicit** failure states.
 *
 * Every capture phase in this project has lost time to a run that looked alive
 * and was not. The three real incidents:
 *
 * - two runs collided on one port and the second died instantly, but the first
 *   was still writing files, so progress *looked* normal;
 * - a run continued after the machine slept and its browser had gone, leaving
 *   the script blocked forever on a screenshot;
 * - a run was simply slow under SwiftShader, which is indistinguishable from
 *   both of the above if you are watching file mtimes.
 *
 * Watching mtimes cannot separate "slow", "stalled" and "dead" — the file
 * system looks identical. So each of those becomes a named, thrown outcome:
 *
 * - `port-collision` — refuses to start rather than racing an existing run.
 * - `server-timeout`  — the dev server never answered.
 * - `browser-lost`    — the page or its process disappeared mid-run.
 * - `step-timeout`    — one named step exceeded its own budget.
 *
 * Deliberately small: a port check, a heartbeat and a per-step deadline. Not an
 * infrastructure rewrite.
 */
export type CaptureFailure = 'port-collision' | 'server-timeout' | 'browser-lost' | 'step-timeout';

export class CaptureError extends Error {
  constructor(readonly failure: CaptureFailure, message: string) {
    super(`[${failure}] ${message}`);
    this.name = 'CaptureError';
  }
}

/** Rejects rather than letting a second run quietly fight the first for a port. */
export async function assertPortFree(port: number): Promise<void> {
  const free = await new Promise<boolean>((resolve) => {
    const probe = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => probe.close(() => resolve(true)))
      .listen(port, '127.0.0.1');
  });
  if (!free) {
    throw new CaptureError(
      'port-collision',
      `port ${port} is already in use — another capture run is probably still going. `
      + `Stop it first (pkill -f capture-) rather than starting a second.`,
    );
  }
}

export async function waitForServer(baseUrl: string, timeoutMs = 90_000): Promise<void> {
  const start = Date.now();
  let lastError = 'no response';
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new CaptureError('server-timeout', `${baseUrl} did not answer within ${timeoutMs / 1000}s (${lastError})`);
}

/**
 * Runs one named step against its own deadline.
 *
 * The point is the *name*: a timeout reports which step hung, so "the capture
 * stalled" becomes "the 20 m warm-up never finished". A bare `await` that never
 * settles reports nothing at all.
 */
export async function step<T>(name: string, budgetMs: number, work: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new CaptureError('step-timeout', `"${name}" exceeded ${Math.round(budgetMs / 1000)}s`)),
          budgetMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Emits a heartbeat so a slow run is visibly *alive*.
 *
 * This is the line that separates "slow" from "stalled" without inspecting the
 * filesystem: if heartbeats keep arriving the run is working, and if they stop
 * the process itself is gone.
 */
export function startHeartbeat(label: string, intervalMs = 15_000): () => void {
  const start = Date.now();
  const timer = setInterval(() => {
    console.log(`[heartbeat] ${label} — alive, ${Math.round((Date.now() - start) / 1000)}s elapsed`);
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

/** Spawns the dev server and fails loudly if it exits before the run finishes. */
export function spawnDevServer(port: number, onEarlyExit: (code: number | null) => void): ChildProcess {
  const server = spawn('pnpm', ['exec', 'vite', '--port', String(port), '--strictPort'], {
    env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' },
    stdio: 'pipe',
  });
  server.on('exit', (code) => onEarlyExit(code));
  return server;
}
