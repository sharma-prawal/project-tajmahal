export interface MemoryCameraCommand { owner: string; position: readonly [number, number, number]; target: readonly [number, number, number]; durationMs: number; elapsedMs: number; }
class MemoryCameraState {
  command: MemoryCameraCommand | null = null;
  set(command: MemoryCameraCommand): void { this.command = command; }
  clear(owner?: string): void { if (!owner || this.command?.owner === owner) this.command = null; }
}
export const memoryCameraState = new MemoryCameraState();

export function cameraBlendProgress(elapsedMs: number, durationMs: number, reducedMotion: boolean): number {
  if (reducedMotion || durationMs <= 0) return 1;
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  // Quintic smootherstep has zero first and second derivatives at both ends,
  // avoiding the small acceleration discontinuity of cubic smoothstep while
  // preserving every authored camera duration and midpoint.
  return t * t * t * (t * (t * 6 - 15) + 10);
}
