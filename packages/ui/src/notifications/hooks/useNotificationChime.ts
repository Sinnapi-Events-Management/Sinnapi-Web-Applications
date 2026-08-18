'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type NotificationChime = {
  /** The browser exposes Web Audio at all. */
  supported: boolean;
  /** Opted in — the only state in which `play` makes a sound. */
  enabled: boolean;
  /** Prompt-free opt-in. MUST be called from a user gesture; see below. */
  enable: () => Promise<boolean>;
  disable: () => void;
  /** Sound one if allowed. Returns whether it actually played. */
  play: () => boolean;
};

export type UseNotificationChimeOptions = {
  /** localStorage key holding the opt-in, e.g. `sinnapi.client.notificationChime`. */
  storageKey: string;
  /**
   * Shortest gap between two chimes, in ms. A burst — six notifications landing
   * as one transaction commits — should be one sound, not six.
   */
  throttleMs?: number;
};

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function readOptIn(storageKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(storageKey) === 'on';
  } catch {
    // Private-mode Safari throws on localStorage. A missing preference is off,
    // which is the safe default for something that makes a noise.
    return false;
  }
}

/**
 * An audible cue for notification arrivals.
 *
 * WHY THIS EXISTS ALONGSIDE `useDesktopNotifications`
 * The OS notification is the wrong instrument for most of the working day. It
 * is suppressed while the tab is focused — correctly, since the page already
 * shows the arrival — which means someone with the portal open in front of them
 * hears nothing, and that is exactly when a booking request or an accepted
 * quote is most worth reacting to. The two are complementary: the toast is for
 * when you are looking elsewhere, the chime is for when you are looking here.
 *
 * WHY IT IS SYNTHESISED AND NOT A FILE
 * A two-note tone from an oscillator has no asset to ship, host, cache or fail
 * to load, works offline, and costs nothing on a page that never plays it —
 * `AudioContext` is not constructed until the user opts in. An mp3 would need a
 * copy per portal in `public/` and a fetch on a page most people never make a
 * sound on.
 *
 * WHY `enable()` MUST COME FROM A CLICK
 * Browsers create an `AudioContext` in the `suspended` state unless the page has
 * been interacted with, and `resume()` only succeeds from a user gesture. Wiring
 * `enable` to a toggle both satisfies that rule and makes the opt-in explicit —
 * a sound the user did not ask for is the reason sounds get muted at the OS.
 */
export function useNotificationChime({
  storageKey,
  throttleMs = 2500,
}: UseNotificationChimeOptions): NotificationChime {
  const [supported, setSupported] = useState(false);
  const [optedIn, setOptedIn] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const lastPlayedAt = useRef(0);

  // Read after mount, never during render: both sources are browser-only and
  // would diverge under SSR if they seeded the initial state.
  useEffect(() => {
    setSupported(audioContextCtor() !== null);
    setOptedIn(readOptIn(storageKey));
  }, [storageKey]);

  // The context outlives every render but not the component. Closing it on
  // unmount matters because browsers cap the number of live contexts per page,
  // and a portal that mounts its shell repeatedly would otherwise exhaust them.
  useEffect(() => {
    return () => {
      void ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  /**
   * Re-arm an opt-in that survived a reload.
   *
   * The preference is in localStorage; the running `AudioContext` is not. On
   * every fresh page load the user is opted in and there is nothing to play
   * through, and the browser will not let us build one until the page has been
   * interacted with — so without this the chime would report itself enabled and
   * stay silent for the whole session, which is worse than being off.
   *
   * The listeners are passive, once, and removed either way. This is not a
   * prompt and asks the user for nothing: it borrows the first click or keypress
   * they were going to make anyway.
   */
  useEffect(() => {
    if (!supported || !optedIn) return;
    if (typeof document === 'undefined') return;
    if (ctxRef.current?.state === 'running') return;

    let cancelled = false;

    const arm = () => {
      if (cancelled) return;
      const Ctor = audioContextCtor();
      if (!Ctor) return;
      try {
        ctxRef.current ??= new Ctor();
        if (ctxRef.current.state === 'suspended') void ctxRef.current.resume().catch(() => {});
      } catch {
        // No context, no chime. Nothing else about the page depends on it.
      }
    };

    document.addEventListener('pointerdown', arm, { once: true, passive: true });
    document.addEventListener('keydown', arm, { once: true, passive: true });

    return () => {
      cancelled = true;
      document.removeEventListener('pointerdown', arm);
      document.removeEventListener('keydown', arm);
    };
  }, [supported, optedIn]);

  const persist = useCallback(
    (next: boolean) => {
      setOptedIn(next);
      try {
        window.localStorage.setItem(storageKey, next ? 'on' : 'off');
      } catch {
        // Preference is in-memory for this session; the chime still works.
      }
    },
    [storageKey],
  );

  const enable = useCallback(async () => {
    const Ctor = audioContextCtor();
    if (!Ctor) return false;

    try {
      ctxRef.current ??= new Ctor();
      // Called from the gesture, so this is the one moment `resume` is allowed
      // to succeed. Without it the first real arrival would play into a
      // suspended context and be silently dropped.
      if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
    } catch {
      return false;
    }

    persist(true);
    return true;
  }, [persist]);

  const disable = useCallback(() => persist(false), [persist]);

  const play = useCallback(() => {
    if (!optedIn) return false;

    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return false;

    // A burst is one event to the person hearing it. Six chimes in a second is
    // what makes someone turn the feature off rather than read the feed.
    const now = Date.now();
    if (now - lastPlayedAt.current < throttleMs) return false;
    lastPlayedAt.current = now;

    try {
      // Two notes a fifth apart, rising: short enough not to interrupt, pitched
      // to carry over speech without being an alarm. A rise reads as "something
      // arrived"; a fall reads as "something failed".
      const start = ctx.currentTime;
      for (const [frequency, at] of [
        [880, 0],
        [1318.5, 0.11],
      ] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = frequency;

        // An envelope, not a switch. A gain that jumps to full produces an
        // audible click on the discontinuity, which is the difference between
        // a chime and a pop.
        gain.gain.setValueAtTime(0.0001, start + at);
        gain.gain.exponentialRampToValueAtTime(0.14, start + at + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.22);

        osc.connect(gain).connect(ctx.destination);
        osc.start(start + at);
        osc.stop(start + at + 0.24);
      }
      return true;
    } catch {
      // A failed sound is never worth breaking the page for.
      return false;
    }
  }, [optedIn, throttleMs]);

  return {
    supported,
    // The context is only ever built inside `enable`, so a stored opt-in from a
    // previous session reports as enabled the moment it is re-armed there.
    enabled: supported && optedIn,
    enable,
    disable,
    play,
  };
}
