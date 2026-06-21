import { describe, it, expect } from 'vitest';
import { activeWordAt, groupWordTimings, toWordTokens, wordIndexAtChar } from './alignment';
import type { CharAlignment } from './alignment';

const A = (chars: string[], starts: number[], ends: number[]): CharAlignment => ({
  characters: chars,
  character_start_times_seconds: starts,
  character_end_times_seconds: ends,
});

describe('groupWordTimings', () => {
  it('groups non-space characters into words spanning their first and last char', () => {
    // "hi go"
    const al = A(['h', 'i', ' ', 'g', 'o'], [0, 0.1, 0.2, 0.3, 0.4], [0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(groupWordTimings(al)).toEqual([
      { text: 'hi', start: 0, end: 0.2 },
      { text: 'go', start: 0.3, end: 0.5 },
    ]);
  });

  it('keeps punctuation attached to its word', () => {
    const al = A(['i', 't', '!'], [0, 0.1, 0.2], [0.1, 0.2, 0.3]);
    expect(groupWordTimings(al)).toEqual([{ text: 'it!', start: 0, end: 0.3 }]);
  });

  it('collapses runs of whitespace', () => {
    const al = A(['a', ' ', ' ', 'b'], [0, 0.1, 0.2, 0.3], [0.1, 0.2, 0.3, 0.4]);
    expect(groupWordTimings(al)).toEqual([
      { text: 'a', start: 0, end: 0.1 },
      { text: 'b', start: 0.3, end: 0.4 },
    ]);
  });

  it('returns nothing for an empty alignment', () => {
    expect(groupWordTimings(A([], [], []))).toEqual([]);
  });
});

describe('activeWordAt', () => {
  const words = [
    { text: 'a', start: 0, end: 0.2 },
    { text: 'b', start: 0.3, end: 0.5 },
  ];

  it('is null before the first word starts', () => {
    expect(activeWordAt(words, -0.1)).toBe(null);
  });

  it('points at the word currently being spoken', () => {
    expect(activeWordAt(words, 0.1)).toBe(0);
    expect(activeWordAt(words, 0.4)).toBe(1);
  });

  it('holds the last started word through the gap before the next', () => {
    expect(activeWordAt(words, 0.25)).toBe(0);
  });

  it('keeps the final word once time runs past the end', () => {
    expect(activeWordAt(words, 9)).toBe(1);
  });
});

describe('toWordTokens', () => {
  it('splits into word and whitespace tokens, preserving order', () => {
    expect(toWordTokens('hi  go!')).toEqual([
      { value: 'hi', word: true },
      { value: '  ', word: false },
      { value: 'go!', word: true },
    ]);
  });

  it('produces one word token per word that groupWordTimings would time', () => {
    const text = 'You did it! Two parts — both done.';
    const chars = [...text];
    const al = A(
      chars,
      chars.map((_, i) => i),
      chars.map((_, i) => i + 1),
    );
    const wordTokens = toWordTokens(text).filter((t) => t.word);
    expect(wordTokens).toHaveLength(groupWordTimings(al).length);
  });
});

describe('wordIndexAtChar', () => {
  it('maps a character offset to its word index', () => {
    expect(wordIndexAtChar('You did it', 0)).toBe(0);
    expect(wordIndexAtChar('You did it', 4)).toBe(1);
    expect(wordIndexAtChar('You did it', 8)).toBe(2);
  });

  it('maps a space to the word just spoken', () => {
    expect(wordIndexAtChar('You did it', 3)).toBe(0);
  });
});
