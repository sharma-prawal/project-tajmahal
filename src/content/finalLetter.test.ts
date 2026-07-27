import { describe, expect, it } from 'vitest';
import { FINAL_LETTER_PARAGRAPHS } from './finalLetter';

describe('final letter', () => {
  it('preserves the complete approved letter in its authored order', () => {
    expect(FINAL_LETTER_PARAGRAPHS).toHaveLength(13);
    expect(FINAL_LETTER_PARAGRAPHS[0]).toBe('Dear Aashna,');
    expect(FINAL_LETTER_PARAGRAPHS[1]).toContain("If you've reached this place");
    expect(FINAL_LETTER_PARAGRAPHS[8]).toBe('The smallest moments of care are the ones that stay with us the longest.');
    expect(FINAL_LETTER_PARAGRAPHS.at(-1)).toBe('From Prawal.');
  });
});
