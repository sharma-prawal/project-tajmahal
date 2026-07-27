export const JOURNAL_MEMORY_COUNT = 7;

const JOURNAL_COPY = [
  ['A forgotten moment has returned.', 'Some memories are still quietly waiting in the garden...'],
  ['Another memory has returned.', 'The garden still holds more stories.'],
  ['A memory has found its place again.', 'There are still quiet moments waiting to be remembered.'],
  ['More of the garden remembers.', 'A few stories are still resting among its paths.'],
  ['The memories are gathering.', 'The garden is drawing closer to what it has kept.'],
  ['Only one memory remains.', 'The garden is almost ready to reveal its final secret.'],
  ['Every memory has returned.', 'The mausoleum awaits.'],
] as const;

export function journalCopy(count: number): readonly [string, string] {
  const index = Math.min(JOURNAL_MEMORY_COUNT, Math.max(1, Math.floor(count))) - 1;
  return JOURNAL_COPY[index];
}

export function recoveredMemoryCount(previous: number, next: number): number | null {
  if (!Number.isFinite(next) || next <= previous || next < 1) return null;
  return Math.min(JOURNAL_MEMORY_COUNT, Math.floor(next));
}
