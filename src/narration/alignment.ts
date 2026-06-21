/** ElevenLabs character-level timing for one spoken utterance. */
export interface CharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** One spoken word with its time window, derived from the character alignment. */
export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

/**
 * Group the character-level alignment into whitespace-delimited words with timings. A word
 * spans from its first character's start to its last character's end. Pure — this is what
 * lets the bubble grow each word exactly as the voice reaches it.
 */
export function groupWordTimings(alignment: CharAlignment): WordTiming[] {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  const words: WordTiming[] = [];
  let cur: WordTiming | null = null;

  for (let i = 0; i < characters.length; i++) {
    if (/\s/.test(characters[i])) {
      if (cur) {
        words.push(cur);
        cur = null;
      }
      continue;
    }
    if (!cur) cur = { text: characters[i], start: starts[i], end: ends[i] };
    else {
      cur.text += characters[i];
      cur.end = ends[i];
    }
  }
  if (cur) words.push(cur);
  return words;
}

/**
 * The index of the word being spoken at time `t` — the last word that has started — or null
 * before the first word. Holds the last word once playback runs past the end.
 */
export function activeWordAt(words: WordTiming[], t: number): number | null {
  let idx: number | null = null;
  for (let i = 0; i < words.length; i++) {
    if (words[i].start <= t) idx = i;
    else break;
  }
  return idx;
}

/** What /api/tts returns: the spoken audio plus the per-word timings to highlight it. */
export interface SpokenLine {
  audioBase64: string;
  words: WordTiming[];
}

/** A rendering token: a word to show (and possibly highlight) or the whitespace between words. */
export interface WordToken {
  value: string;
  word: boolean;
}

/**
 * Split text into word and whitespace tokens, preserving order and spacing. The n-th `word`
 * token lines up with the n-th entry from groupWordTimings on the same text, so the bubble can
 * highlight by index.
 */
export function toWordTokens(text: string): WordToken[] {
  return text
    .split(/(\s+)/)
    .filter((t) => t.length > 0)
    .map((t) => ({ value: t, word: !/^\s+$/.test(t) }));
}

/**
 * The word index containing character `charIndex` of `text`. Used by the Web Speech fallback,
 * whose boundary events report a character offset; whitespace maps to the word just spoken.
 */
export function wordIndexAtChar(text: string, charIndex: number): number | null {
  let offset = 0;
  let wordIdx = -1;
  for (const token of toWordTokens(text)) {
    if (token.word) wordIdx += 1;
    const next = offset + token.value.length;
    if (charIndex < next) return wordIdx >= 0 ? wordIdx : null;
    offset = next;
  }
  return wordIdx >= 0 ? wordIdx : null;
}
