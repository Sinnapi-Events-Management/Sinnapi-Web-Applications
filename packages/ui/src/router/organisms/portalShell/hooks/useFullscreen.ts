'use client';
import { useCallback, useEffect, useState } from 'react';

/**
 * Thin wrapper over the Fullscreen API for the shell's "Full screen" control.
 *
 * Tracks state via the `fullscreenchange` event rather than local state alone,
 * so pressing Esc or F11 (which the browser handles without telling us) keeps
 * the menu item's label honest.
 */
export function useFullscreen() {
  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [supported]);

  const toggleFullscreen = useCallback(() => {
    if (!supported) return;
    // Both calls reject when the gesture isn't trusted (or the browser blocks
    // it); there is nothing to recover, so swallow rather than crash the shell.
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, [supported]);

  return { supported, isFullscreen, toggleFullscreen };
}
