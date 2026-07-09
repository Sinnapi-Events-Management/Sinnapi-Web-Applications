import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ACTIVITY_EVENTS,
  ACTIVITY_THROTTLE_MS,
  IDLE_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  TICK_INTERVAL_MS,
  WARNING_DURATION_MS,
} from '@/auth/idleConfig';

type IdleTimeout = {
  /** Milliseconds left in the warning countdown, or `null` when not warning. */
  warningRemainingMs: number | null;
  /** Dismiss the warning and restart the idle timer (the user is present). */
  keepSession: () => void;
};

/**
 * Idle state is derived entirely from a single shared `lastActivity` timestamp
 * in localStorage. Every tab computes the same warn/expire window from it, so
 * the warning and the countdown are naturally synchronised across tabs — no
 * message passing needed beyond the `storage` event for instant updates.
 */
function readLastActivity(): number {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function useIdleTimeout(enabled: boolean, onTimeout: () => void): IdleTimeout {
  const [warningRemainingMs, setWarningRemainingMs] = useState<number | null>(null);

  // Refs avoid re-subscribing listeners on every render / prop change.
  const warningRef = useRef(false);
  const firedRef = useRef(false);
  const lastWriteRef = useRef(0);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const writeActivity = useCallback((t: number) => {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(t));
  }, []);

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
      const warnAt = readLastActivity() + IDLE_TIMEOUT_MS;
      const expireAt = warnAt + WARNING_DURATION_MS;

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
      if (now - lastWriteRef.current < ACTIVITY_THROTTLE_MS) return;
      lastWriteRef.current = now;
      writeActivity(now);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) evaluate();
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', evaluate);

    evaluate();
    const interval = window.setInterval(evaluate, TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', evaluate);
    };
  }, [enabled, writeActivity]);

  return { warningRemainingMs, keepSession };
}
