'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_ACTIVITY_EVENTS,
  DEFAULT_ACTIVITY_THROTTLE_MS,
  DEFAULT_TICK_INTERVAL_MS,
  type IdleTimeoutConfig,
  type IdleTimeoutState,
} from '../types';

export type UseIdleTimeoutOptions = {
  /** Only track while a session is held — false on public/auth pages. */
  enabled: boolean;
  /**
   * Must be referentially stable — a module-level constant, or memoised. Every
   * new object re-runs the effect, and re-running it counts as activity, so an
   * inline `{ ... }` here would silently reset the timer on every render and
   * the session would never time out.
   */
  config: IdleTimeoutConfig;
  /** Called once when the warning countdown runs out. */
  onTimeout: () => void;
};

/**
 * Idle state is derived entirely from a single shared `lastActivity` timestamp
 * in localStorage. Every tab computes the same warn/expire window from it, so
 * the warning and the countdown are naturally synchronised across tabs — no
 * message passing needed beyond the `storage` event for instant updates.
 *
 * Headless by design: it owns the timing and nothing else, so the dialog that
 * renders it stays a presentational component and each portal keeps its own
 * sign-out wiring.
 */
function readLastActivity(storageKey: string): number {
  const raw = localStorage.getItem(storageKey);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function useIdleTimeout({
  enabled,
  config,
  onTimeout,
}: UseIdleTimeoutOptions): IdleTimeoutState {
  const [warningRemainingMs, setWarningRemainingMs] = useState<number | null>(null);

  const {
    idleMs,
    warningMs,
    storageKey,
    activityEvents = DEFAULT_ACTIVITY_EVENTS,
    throttleMs = DEFAULT_ACTIVITY_THROTTLE_MS,
    tickMs = DEFAULT_TICK_INTERVAL_MS,
  } = config;

  // Refs avoid re-subscribing listeners on every render / prop change.
  const warningRef = useRef(false);
  const firedRef = useRef(false);
  const lastWriteRef = useRef(0);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const writeActivity = useCallback(
    (t: number) => {
      localStorage.setItem(storageKey, String(t));
    },
    [storageKey],
  );

  const keepSession = useCallback(() => {
    warningRef.current = false;
    firedRef.current = false;
    setWarningRemainingMs(null);
    // Broadcasts to other tabs via the `storage` event → they dismiss too.
    writeActivity(Date.now());
  }, [writeActivity]);

  useEffect(() => {
    if (!enabled) {
      warningRef.current = false;
      firedRef.current = false;
      setWarningRemainingMs(null);
      return;
    }

    // Loading an authenticated page counts as activity — start fresh.
    writeActivity(Date.now());

    const evaluate = () => {
      const now = Date.now();
      const warnAt = readLastActivity(storageKey) + idleMs;
      const expireAt = warnAt + warningMs;

      if (now >= expireAt) {
        // Fire sign-out once; other tabs follow via Supabase auth state change.
        if (!firedRef.current) {
          firedRef.current = true;
          warningRef.current = false;
          setWarningRemainingMs(null);
          onTimeoutRef.current();
        }
        return;
      }

      if (now >= warnAt) {
        warningRef.current = true;
        setWarningRemainingMs(expireAt - now);
      } else {
        warningRef.current = false;
        setWarningRemainingMs(null);
      }
    };

    const onActivity = () => {
      // While the warning is up, passive activity must NOT reset the timer — the
      // user has to explicitly choose "Keep session" or "Log out".
      if (warningRef.current) return;
      const now = Date.now();
      if (now - lastWriteRef.current < throttleMs) return;
      lastWriteRef.current = now;
      writeActivity(now);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) evaluate();
    };

    activityEvents.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', evaluate);

    evaluate();
    const interval = window.setInterval(evaluate, tickMs);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((evt) => window.removeEventListener(evt, onActivity));
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', evaluate);
    };
  }, [enabled, writeActivity, storageKey, idleMs, warningMs, activityEvents, throttleMs, tickMs]);

  return { warningRemainingMs, keepSession };
}
