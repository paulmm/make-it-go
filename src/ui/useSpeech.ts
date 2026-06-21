import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export interface Speech {
  speak: (text: string) => void;
  /** Call on the first user tap so autoplay rules do not block speech. */
  unlock: () => void;
  muted: boolean;
  setMuted: Dispatch<SetStateAction<boolean>>;
  supported: boolean;
}

/**
 * Voice output via the Web Speech API. Output only — never a microphone. Speech is
 * armed on the first tap (browsers block speech before a gesture); anything queued
 * before then is spoken on unlock.
 */
export function useSpeech(): Speech {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [muted, setMuted] = useState(false);
  const unlockedRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const utter = useCallback(
    (text: string) => {
      if (!supported || mutedRef.current) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.pitch = 1.15;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
    [supported],
  );

  const speak = useCallback(
    (text: string) => {
      if (!unlockedRef.current) {
        pendingRef.current = text; // speak it once the first tap arrives
        return;
      }
      utter(text);
    },
    [utter],
  );

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) utter(pending);
  }, [utter]);

  useEffect(() => {
    if (muted && supported) window.speechSynthesis.cancel();
  }, [muted, supported]);

  return { speak, unlock, muted, setMuted, supported };
}
