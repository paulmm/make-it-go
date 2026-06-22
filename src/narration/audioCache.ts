import type { SpokenLine } from './alignment';

// A persistent, per-device cache of spoken lines (audio + word timings), keyed by the exact text.
// The level intros are fixed, repeated scripts, so after the first time a line is heard it replays
// instantly from the device and costs no TTS credits ever again. Best-effort and never throws — if
// IndexedDB is unavailable (SSR, private mode), every call no-ops and we simply fall back to the
// network. Only successful lines are stored, so a quota/credit failure is never cached.

const DB_NAME = 'makeitgo-voice';
const STORE = 'lines';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/** The cached spoken line for `text`, or undefined if it isn't stored. Never throws. */
export async function getCachedLine(text: string): Promise<SpokenLine | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(text);
      req.onsuccess = () => resolve((req.result as SpokenLine) ?? undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

/** Persist a spoken line so it replays instantly and costs no credits next time. Never throws. */
export async function putCachedLine(text: string, line: SpokenLine): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(line, text);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
