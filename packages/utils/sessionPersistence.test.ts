import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionPersistence, getDeviceId } from './sessionPersistence';

/** A minimal in-memory Web Storage, so the tests run in the node environment. */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}

const KEY = 'sinnapi-vendor-auth';
const PREF = 'sinnapi.vendor.rememberDevice';

let local: MemoryStorage;
let perTab: MemoryStorage;

beforeEach(() => {
  local = new MemoryStorage();
  perTab = new MemoryStorage();
  vi.stubGlobal('window', { localStorage: local, sessionStorage: perTab });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createSessionPersistence', () => {
  it('remembers by default and keeps the session in localStorage', () => {
    const p = createSessionPersistence({ storageKey: KEY, preferenceKey: PREF });
    expect(p.isRemembered()).toBe(true);
    p.storage.setItem(KEY, 'token');
    expect(local.getItem(KEY)).toBe('token');
    expect(perTab.getItem(KEY)).toBeNull();
  });

  it('keeps an unremembered session in sessionStorage only', () => {
    const p = createSessionPersistence({ storageKey: KEY, preferenceKey: PREF });
    p.setRemember(false);
    p.storage.setItem(KEY, 'token');
    expect(perTab.getItem(KEY)).toBe('token');
    expect(local.getItem(KEY)).toBeNull();
    expect(p.storage.getItem(KEY)).toBe('token');
  });

  it('moves an existing session when the choice changes, and only this portal’s keys', () => {
    const p = createSessionPersistence({ storageKey: KEY, preferenceKey: PREF });
    local.setItem(KEY, 'token');
    local.setItem(`${KEY}-code-verifier`, 'pkce');
    local.setItem('sinnapi-client-auth', 'other-portal');
    p.setRemember(false);
    expect(perTab.getItem(KEY)).toBe('token');
    expect(perTab.getItem(`${KEY}-code-verifier`)).toBe('pkce');
    expect(local.getItem(KEY)).toBeNull();
    expect(local.getItem('sinnapi-client-auth')).toBe('other-portal');
  });

  it('removes from both stores on sign-out', () => {
    const p = createSessionPersistence({ storageKey: KEY, preferenceKey: PREF });
    local.setItem(KEY, 'a');
    perTab.setItem(KEY, 'b');
    p.storage.removeItem(KEY);
    expect(local.getItem(KEY)).toBeNull();
    expect(perTab.getItem(KEY)).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
      get sessionStorage(): Storage {
        throw new Error('blocked');
      },
    });
    const p = createSessionPersistence({ storageKey: KEY, preferenceKey: PREF });
    expect(() => p.storage.setItem(KEY, 'x')).not.toThrow();
    expect(p.storage.getItem(KEY)).toBeNull();
    expect(p.isRemembered()).toBe(true);
  });
});

describe('getDeviceId', () => {
  it('creates one id and then reuses it', () => {
    const first = getDeviceId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getDeviceId()).toBe(first);
  });
});
