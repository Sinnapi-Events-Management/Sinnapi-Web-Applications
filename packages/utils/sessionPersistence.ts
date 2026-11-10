/**
 * Where a portal keeps its Supabase session, and the device id it signs in with.
 *
 * Shared by the client and vendor portals, which both let the person choose
 * "Keep me signed in on this device" at sign-in:
 *
 *   ticked (the default)  the session lives in localStorage and survives closing
 *                         the browser, restarting the phone, and weeks of disuse,
 *                         up to Supabase's 60-day inactivity timeout. This is the
 *                         Facebook/WhatsApp behaviour people expect.
 *   unticked              the session lives in sessionStorage, so it is gone when
 *                         the tab or browser is closed, and the portal gate also
 *                         ends it after 12 hours whatever happens. This is for an
 *                         internet café or a borrowed phone.
 *
 * The choice itself is stored in localStorage (it is not a secret) under a
 * per-portal key, so the adapter knows which store to read on the next page load.
 * A missing preference means "remember", because the overwhelming majority of
 * these sessions are on the person's own phone.
 *
 * Every storage access is wrapped: private browsing modes and locked-down
 * webviews throw on access, and losing the session in that case is better than
 * a white screen.
 */

/** The subset of the Web Storage API supabase-js needs from a custom store. */
export type AuthStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const local = (): Storage | null => safe(() => window.localStorage, null);
const perTab = (): Storage | null => safe(() => window.sessionStorage, null);

export type SessionPersistence = {
  /** Pass as `auth.storage` to `createClient`. */
  storage: AuthStorage;
  /**
   * Record the sign-in form's choice. Must be called BEFORE `setSession`, so
   * supabase-js writes the new session into the right store. Any session already
   * held in the other store is moved across rather than lost.
   */
  setRemember(remember: boolean): void;
  /** The current choice; `true` when it was never set. */
  isRemembered(): boolean;
};

export function createSessionPersistence({
  storageKey,
  preferenceKey,
}: {
  /** The `auth.storageKey` given to `createClient`; every key supabase-js writes starts with it. */
  storageKey: string;
  /** Where the remember choice itself is kept. */
  preferenceKey: string;
}): SessionPersistence {
  const isRemembered = () => safe(() => local()?.getItem(preferenceKey) !== '0', true);
  const active = () => (isRemembered() ? local() : perTab()) ?? perTab() ?? local();
  const inactive = () => (isRemembered() ? perTab() : local());

  const storage: AuthStorage = {
    getItem: (key) => safe(() => active()?.getItem(key) ?? null, null),
    setItem: (key, value) => {
      safe(() => active()?.setItem(key, value), undefined);
      // Never leave a copy in the store we are not using: a stale token left in
      // localStorage after choosing "don't remember" would defeat the choice.
      safe(() => inactive()?.removeItem(key), undefined);
    },
    removeItem: (key) => {
      safe(() => local()?.removeItem(key), undefined);
      safe(() => perTab()?.removeItem(key), undefined);
    },
  };

  const setRemember = (remember: boolean) => {
    if (remember === isRemembered()) return;
    const from = active();
    const snapshot: [string, string][] = [];
    safe(() => {
      if (!from) return;
      for (let i = 0; i < from.length; i += 1) {
        const key = from.key(i);
        // Only this portal's auth keys move — supabase-js prefixes every one of
        // them (session, PKCE verifier, user) with the storageKey.
        if (key && key.startsWith(storageKey)) {
          const value = from.getItem(key);
          if (value !== null) snapshot.push([key, value]);
        }
      }
    }, undefined);
    safe(() => local()?.setItem(preferenceKey, remember ? '1' : '0'), undefined);
    snapshot.forEach(([key, value]) => storage.setItem(key, value));
  };

  return { storage, setRemember, isRemembered };
}

const DEVICE_ID_KEY = 'sinnapi.deviceId';

/**
 * A random id for this browser, created once and kept in localStorage.
 *
 * Used only to answer "has this account been signed in on this device before?"
 * for the new-sign-in alert and the device list. It is deliberately NOT a
 * fingerprint: clearing site data makes a new one, and the device then honestly
 * counts as new. Null when storage is unavailable.
 */
export function getDeviceId(): string | null {
  return safe(() => {
    const store = window.localStorage;
    const existing = store.getItem(DEVICE_ID_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const created = crypto.randomUUID();
    store.setItem(DEVICE_ID_KEY, created);
    return created;
  }, null);
}
