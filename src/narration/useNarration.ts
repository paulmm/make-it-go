import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { activeWordAt, wordIndexAtChar } from './alignment';
import type { SpokenLine } from './alignment';

export interface Narration {
  /**
   * Speak a line. `track` marks the partner's line so the bubble highlights each word.
   * `onDone` fires once when the line finishes being read aloud (or right away when muted),
   * so the UI can react to "the voice stopped talking" — e.g. revealing the win choices.
   */
  speak: (text: string, opts?: { track?: boolean; onDone?: () => void }) => void;
  /** Warm a line's audio ahead of time (e.g. during the run animation) so it plays with no pause. */
  prime: (text: string) => void;
  /** Call on a user tap so any line blocked by autoplay rules plays now. */
  unlock: () => void;
  muted: boolean;
  setMuted: Dispatch<SetStateAction<boolean>>;
  supported: boolean;
  /** The line currently being read aloud with highlighting, or null. */
  spokenText: string | null;
  /** The index of the word being spoken within spokenText, or null. */
  activeWord: number | null;
}

interface Pending {
  text: string;
  track: boolean;
  line: SpokenLine | null;
  onDone?: () => void;
}

const MUTED_DONE_MS = 1300; // with audio off, wait a celebratory beat before signaling "done"

/** Rough spoken duration (seconds) for a fallback timer when exact word timings aren't available. */
function estimateSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1.2, words / 2.4);
}

/**
 * Voice output via ElevenLabs (warm, real voice) with karaoke word highlighting: the server
 * proxy returns audio plus per-word timings, and we grow each word in the bubble as the voice
 * reaches it. Falls back to the Web Speech API when the key is absent or a request fails, so
 * the app still talks (and still highlights, via boundary events) with no backend. Output
 * only — never a microphone.
 *
 * Latency is hidden two ways: callers `prime()` the next line during the run animation so its
 * audio is cached before it is needed, and every `speak()` tries to play immediately —
 * succeeding inside (or just after) a tap, and otherwise waiting for the next `unlock()`.
 */
export function useNarration(): Narration {
  const supported = typeof window !== 'undefined';
  const [muted, setMuted] = useState(false);
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const [activeWord, setActiveWord] = useState<number | null>(null);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const pendingRef = useRef<Pending | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const cacheRef = useRef<Map<string, SpokenLine | null>>(new Map());
  const seqRef = useRef(0); // bumped per play so stale audio/RAF callbacks bail out

  const audioEl = useCallback(() => {
    if (!audioRef.current && supported) audioRef.current = new Audio();
    return audioRef.current;
  }, [supported]);

  const stopAll = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    audioRef.current?.pause();
    if (supported && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [supported]);

  // Fetch (and cache) the spoken line for a text; null means "use the Web Speech fallback".
  const ensureLine = useCallback(async (text: string): Promise<SpokenLine | null> => {
    const cache = cacheRef.current;
    if (cache.has(text)) return cache.get(text) ?? null;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const line = res.ok ? ((await res.json()) as SpokenLine) : null;
      cache.set(text, line);
      return line;
    } catch {
      cache.set(text, null);
      return null;
    }
  }, []);

  const prime = useCallback(
    (text: string) => {
      // Don't spend a TTS request to warm audio we won't play while muted.
      if (text && supported && !mutedRef.current) void ensureLine(text);
    },
    [ensureLine, supported],
  );

  const play = useCallback(
    (text: string, track: boolean, line: SpokenLine | null, onDone?: () => void) => {
      if (mutedRef.current || !supported) {
        if (onDone) window.setTimeout(onDone, MUTED_DONE_MS);
        return;
      }
      stopAll();
      const seq = ++seqRef.current;
      // Fire onDone exactly once when this line finishes (or a safety timer elapses), unless a
      // newer line has superseded it — so the UI can react to "the voice finished talking".
      let doneFired = false;
      const finish = () => {
        if (doneFired || seq !== seqRef.current) return;
        doneFired = true;
        onDone?.();
      };
      if (track) {
        setSpokenText(text);
        setActiveWord(null);
      }
      const clearPending = () => {
        if (pendingRef.current?.text === text) pendingRef.current = null;
      };

      if (line && line.audioBase64) {
        const a = audioEl();
        if (!a) {
          finish();
          return;
        }
        a.src = `data:audio/mpeg;base64,${line.audioBase64}`;
        a.onended = () => {
          if (seq === seqRef.current && track) setActiveWord(null);
          finish();
        };
        a.play()
          .then(() => {
            clearPending(); // a successful play means autoplay is unblocked
            if (track && line.words.length && seq === seqRef.current) {
              const tick = () => {
                if (seq !== seqRef.current) return;
                setActiveWord(activeWordAt(line.words, a.currentTime));
                rafRef.current = requestAnimationFrame(tick);
              };
              rafRef.current = requestAnimationFrame(tick);
            }
          })
          .catch(() => {
            /* blocked by autoplay: stays pending until a tap calls unlock() */
          });
        // Safety net: if 'ended' never fires (autoplay-blocked), still finish on time.
        if (onDone) {
          const last = line.words[line.words.length - 1];
          window.setTimeout(finish, ((last?.end ?? estimateSeconds(text)) + 0.6) * 1000);
        }
        return;
      }

      // Fallback: Web Speech, with boundary events driving the highlight where supported.
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.95;
        u.pitch = 1.1;
        if (track) {
          u.onboundary = (e) => {
            if (seq !== seqRef.current) return;
            const idx = wordIndexAtChar(text, e.charIndex ?? 0);
            if (idx != null) setActiveWord(idx);
          };
        }
        u.onend = () => {
          if (seq === seqRef.current && track) setActiveWord(null);
          finish();
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        clearPending();
        if (onDone) window.setTimeout(finish, (estimateSeconds(text) + 0.8) * 1000);
      } else {
        finish();
      }
    },
    [audioEl, stopAll, supported],
  );

  const speak = useCallback(
    (text: string, opts?: { track?: boolean; onDone?: () => void }) => {
      if (!text || !supported) {
        opts?.onDone?.();
        return;
      }
      const onDone = opts?.onDone;
      if (mutedRef.current) {
        // Muted: spend no TTS request at all — just let the UI advance.
        if (onDone) window.setTimeout(onDone, MUTED_DONE_MS);
        return;
      }
      const track = !!opts?.track;
      void ensureLine(text).then((line) => {
        if (mutedRef.current) {
          if (onDone) window.setTimeout(onDone, MUTED_DONE_MS);
          return;
        }
        pendingRef.current = { text, track, line, onDone }; // remembered; cleared on a successful play
        play(text, track, line, onDone); // optimistic — succeeds in or just after a gesture
      });
    },
    [ensureLine, play, supported],
  );

  const unlock = useCallback(() => {
    const p = pendingRef.current;
    if (p && !mutedRef.current) play(p.text, p.track, p.line, p.onDone);
  }, [play]);

  useEffect(() => {
    if (muted) {
      stopAll();
      setActiveWord(null);
    }
  }, [muted, stopAll]);

  useEffect(() => stopAll, [stopAll]); // stop audio on unmount

  return { speak, prime, unlock, muted, setMuted, supported, spokenText, activeWord };
}
