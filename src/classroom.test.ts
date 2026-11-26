// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  captureClassroomCodeFromUrl,
  classroomHeaders,
  clearClassroomCode,
  loadClassroomCode,
  normalizeClassroomCode,
  saveClassroomCode,
  subscribeClassroom,
} from './classroom';

// A classroom code is the one thing a grown-up brings to the device. It must survive a reload,
// ride along on every paid call, and never be seen by the child.

beforeEach(() => {
  localStorage.clear();
});

describe('classroom code', () => {
  it('accepts letters, digits and dashes in any case, and nothing else', () => {
    expect(normalizeClassroomCode(' istek-7k2m ')).toBe('ISTEK-7K2M');
    expect(normalizeClassroomCode('AB')).toBeNull(); // too short
    expect(normalizeClassroomCode('-ABC')).toBeNull(); // must start with a letter or digit
    expect(normalizeClassroomCode('ab cd')).toBeNull();
    expect(normalizeClassroomCode('<script>')).toBeNull();
    expect(normalizeClassroomCode('A'.repeat(33))).toBeNull();
  });

  it('remembers a code on the device and sends it as a header', () => {
    expect(loadClassroomCode()).toBeNull();
    expect(classroomHeaders()).toEqual({});
    expect(saveClassroomCode('istek-7k2m')).toBe('ISTEK-7K2M');
    expect(loadClassroomCode()).toBe('ISTEK-7K2M');
    expect(classroomHeaders()).toEqual({ 'x-classroom-code': 'ISTEK-7K2M' });
    clearClassroomCode();
    expect(loadClassroomCode()).toBeNull();
    expect(classroomHeaders()).toEqual({});
  });

  it('refuses to store something that is not a code', () => {
    expect(saveClassroomCode('not a code!')).toBeNull();
    expect(loadClassroomCode()).toBeNull();
  });

  it("picks the code out of a teacher's shared link and scrubs it from the address bar", () => {
    const hist = { replaceState: vi.fn() };
    const code = captureClassroomCodeFromUrl({ href: 'https://www.makeitgo.org/?class=istek-7k2m&x=1#top' }, hist);
    expect(code).toBe('ISTEK-7K2M');
    expect(loadClassroomCode()).toBe('ISTEK-7K2M');
    expect(hist.replaceState).toHaveBeenCalledWith(null, '', '/?x=1#top');
  });

  it('leaves a plain visit alone', () => {
    const hist = { replaceState: vi.fn() };
    expect(captureClassroomCodeFromUrl({ href: 'https://www.makeitgo.org/' }, hist)).toBeNull();
    expect(hist.replaceState).not.toHaveBeenCalled();
    expect(loadClassroomCode()).toBeNull();
  });

  it('scrubs a malformed ?class= too, without storing it', () => {
    const hist = { replaceState: vi.fn() };
    expect(captureClassroomCodeFromUrl({ href: 'https://www.makeitgo.org/?class=%3Cb%3E' }, hist)).toBeNull();
    expect(loadClassroomCode()).toBeNull();
    expect(hist.replaceState).toHaveBeenCalledWith(null, '', '/');
  });

  it('tells subscribers when the code changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeClassroom(listener);
    saveClassroomCode('ABC-123');
    clearClassroomCode();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    saveClassroomCode('ABC-123');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
