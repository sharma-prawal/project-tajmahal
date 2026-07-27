import { describe, expect, it } from 'vitest';
import { journalCopy, recoveredMemoryCount } from './memoryJournalModel';

describe('MemoryJournalToast', () => {
  it('recognises only forward recovery and clamps corrupt over-counts', () => {
    expect(recoveredMemoryCount(0, 1)).toBe(1);
    expect(recoveredMemoryCount(4, 4)).toBeNull();
    expect(recoveredMemoryCount(4, 3)).toBeNull();
    expect(recoveredMemoryCount(6, 99)).toBe(7);
    expect(recoveredMemoryCount(0, Number.NaN)).toBeNull();
  });

  it('uses the authored first, sixth, and seventh recovery language', () => {
    expect(journalCopy(1)).toEqual([
      'A forgotten moment has returned.',
      'Some memories are still quietly waiting in the garden...',
    ]);
    expect(journalCopy(6)).toEqual([
      'Only one memory remains.',
      'The garden is almost ready to reveal its final secret.',
    ]);
    expect(journalCopy(7)).toEqual([
      'Every memory has returned.',
      'The mausoleum awaits.',
    ]);
  });
});
