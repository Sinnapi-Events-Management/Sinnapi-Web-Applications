'use client';
import { useCallback, useEffect, useState } from 'react';

export type DesktopPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export type DesktopNotifyOptions = {
  title: string;
  body?: string | null;
  /**
   * Collapse key. Two notifications sharing a tag replace rather than stack, so
   * a burst never buries the user's desktop under a column of toasts.
   */
  tag?: string;
  /** Runs when the user activates the notification; the tab is focused first. */
  onClick?: () => void;
};

export type DesktopNotifications = {
  /** The browser exposes the Notification API at all. */
  supported: boolean;
  permission: DesktopPermission;
  /** Opted in *and* granted — the only state in which `notify` fires. */
  enabled: boolean;
  /** True when asking is still worth offering: supported, not yet denied. */
  canEnable: boolean;
  /** Prompt and opt in. MUST be called from a user gesture. Resolves to the outcome. */
  enable: () => Promise<boolean>;
  /** Opt out locally. The browser-level grant is the user's to revoke. */
  disable: () => void;
  /** Raise one if allowed. Returns whether it actually fired. */
  notify: (options: DesktopNotifyOptions) => boolean;
};

export type UseDesktopNotificationsOptions = {
  /** localStorage key holding the opt-in, e.g. `sinnapi.client.desktopAlerts`. */
  storageKey: string;
  /**
   * Suppress alerts while the tab is visible. On by default: the page already
   * shows the arrival, and a desktop toast for something on screen is noise.
   */
  onlyWhenHidden?: boolean;
};

function readPermission(): DesktopPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as DesktopPermission;
}

function readOptIn(storageKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(storageKey) === 'on';
  } catch {
    // Private-mode Safari throws on localStorage access. A missing preference
    // is off, which is the safe default for something that interrupts.
    return false;
  }
}

/**
 * Desktop (OS-level) alerts for notification arrivals.
 *
 * Two separate switches, deliberately: the browser's permission grant, and the
 * user's opt-in stored locally. Permission alone is not consent to be
 * interrupted — a grant made months ago for one feature should not silently
 * enable another — and the local flag is what lets someone turn alerts off from
 * inside the app, which browsers make deliberately hard to do from their own UI.
 *
 * Nothing here prompts on mount. `Notification.requestPermission()` fired on
 * page load is the pattern browsers now penalise and users reflexively block,
 * so `enable()` exists to be wired to a button and nothing calls it otherwise.
 */
export function useDesktopNotifications({
  storageKey,
  onlyWhenHidden = true,
}: UseDesktopNotificationsOptions): DesktopNotifications {
  const [permission, setPermission] = useState<DesktopPermission>('unsupported');
  const [optedIn, setOptedIn] = useState(false);

  // Read after mount, never during render: both sources are browser-only, and
  // reading them in the initial state would diverge under SSR.
  useEffect(() => {
    setPermission(readPermission());
    setOptedIn(readOptIn(storageKey));
  }, [storageKey]);

  const supported = permission !== 'unsupported';
  const enabled = supported && permission === 'granted' && optedIn;

  const persist = useCallback(
    (next: boolean) => {
      setOptedIn(next);
      try {
        window.localStorage.setItem(storageKey, next ? 'on' : 'off');
      } catch {
        // Preference is in-memory for this session; alerts still work.
      }
    },
    [storageKey],
  );

  const enable = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    let result = Notification.permission as DesktopPermission;
    if (result === 'default') {
      result = (await Notification.requestPermission()) as DesktopPermission;
    }
    setPermission(result);

    const granted = result === 'granted';
    // Only record the opt-in on success. Storing it against a denied permission
    // would leave the toggle stuck "on" while nothing could ever fire.
    if (granted) persist(true);
    return granted;
  }, [persist]);

  const disable = useCallback(() => persist(false), [persist]);

  const notify = useCallback(
    ({ title, body, tag, onClick }: DesktopNotifyOptions) => {
      if (!enabled) return false;
      if (onlyWhenHidden && typeof document !== 'undefined' && !document.hidden) return false;

      try {
        const instance = new Notification(title, {
          body: body ?? undefined,
          tag,
          // Bursts land silently after the first; the tag already collapses
          // them visually, and a queue of chimes is what makes people revoke.
          renotify: false,
        } as NotificationOptions);

        instance.onclick = () => {
          window.focus();
          instance.close();
          onClick?.();
        };
        return true;
      } catch {
        // Some browsers throw for `new Notification` in a worker-only context.
        // A failed alert is never worth breaking the page for.
        return false;
      }
    },
    [enabled, onlyWhenHidden],
  );

  return {
    supported,
    permission,
    enabled,
    canEnable: supported && permission !== 'denied' && !enabled,
    enable,
    disable,
    notify,
  };
}
