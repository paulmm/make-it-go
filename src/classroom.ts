// A classroom code is how a school gets the full experience: handed to a teacher by email (see
// /teachers/), it switches on the live Claude partner and the warm voice for that class, inside
// the class's own daily budget, and lifts the per-IP limit a shared school connection would
// otherwise trip. It is never shown to or needed by the child — every level plays without one,
// with the scripted partner and the browser voice.
//
// A code reaches a device one of two ways: in the link the teacher shares
// (https://www.makeitgo.org/?class=CODE), which is remembered and then scrubbed from the address
// bar, or typed by a grown-up in the dashboard. It lives in localStorage, per device, no account.
// The server decides whether a code is real; the client only checks its shape.

const KEY = 'makeitgo.classroom.v1';
const PARAM = 'class';
const HEADER = 'x-classroom-code';
// Letters, digits and hyphens, 3 to 32 characters — case-insensitive, stored upper-case.
const SHAPE = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

/** Upper-cased and trimmed, or null when the text is not shaped like a code. */
export function normalizeClassroomCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return SHAPE.test(code) ? code : null;
}

/** The code stored on this device, or null. */
export function loadClassroomCode(): string | null {
  try {
    const raw = storage()?.getItem(KEY);
    return raw ? normalizeClassroomCode(raw) : null;
  } catch {
    return null;
  }
}

/** Remember a code on this device. Returns the stored code, or null when the text is not one. */
export function saveClassroomCode(raw: string): string | null {
  const code = normalizeClassroomCode(raw);
  if (!code) return null;
  try {
    storage()?.setItem(KEY, code);
  } catch {
    /* storage full / unavailable — the code lives for this page load only via the listeners */
  }
  emit();
  return code;
}

/** Forget the code on this device. */
export function clearClassroomCode(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/**
 * Pick a code out of the page URL (?class=CODE), store it, and scrub the parameter so the child
 * never sees it and a reload or share doesn't carry it. Returns the stored code, or null when
 * the URL carried none (or something not shaped like one).
 */
export function captureClassroomCodeFromUrl(
  loc: { href: string } = window.location,
  hist: { replaceState: (data: unknown, unused: string, url: string) => void } = window.history,
): string | null {
  let url: URL;
  try {
    url = new URL(loc.href);
  } catch {
    return null;
  }
  const raw = url.searchParams.get(PARAM);
  if (raw === null) return null;
  const code = saveClassroomCode(raw);
  url.searchParams.delete(PARAM);
  try {
    hist.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch {
    /* some embedded browsers refuse — harmless */
  }
  return code;
}

/** Request headers that carry the device's classroom code to /api/partner and /api/tts. */
export function classroomHeaders(): Record<string, string> {
  const code = loadClassroomCode();
  return code ? { [HEADER]: code } : {};
}

/** Re-render hook for the dashboard: fires when the stored code changes. */
export function subscribeClassroom(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
