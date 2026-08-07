'use client';
import { useCallback, useEffect } from 'react';
import { shellStorageKey } from '../constants';
import type { PortalContentWidth } from '../types';
import { useStoredState } from './useStoredState';
import { useFullscreen } from './useFullscreen';

export interface ViewPreferences {
  /** Sidebar reduced to an icon rail (desktop only). */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** All chrome hidden — sidebar and top bar — for a full-viewport page. */
  focus: boolean;
  toggleFocus: () => void;
  exitFocus: () => void;
  contentWidth: PortalContentWidth;
  toggleContentWidth: () => void;
  fullscreenSupported: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

/**
 * The four ways a user can reshape the shell: collapse the sidebar to a rail,
 * hide the chrome entirely, widen the content column, and take the browser
 * fullscreen. The first three persist per portal; fullscreen is owned by the
 * browser and deliberately not restored on load.
 */
export function useViewPreferences(portalId: string): ViewPreferences {
  const [collapsed, setCollapsed] = useStoredState(shellStorageKey(portalId, 'collapsed'), false);
  const [focus, setFocus] = useStoredState(shellStorageKey(portalId, 'focus'), false);
  const [contentWidth, setContentWidth] = useStoredState<PortalContentWidth>(
    shellStorageKey(portalId, 'width'),
    'contained',
  );
  const { supported, isFullscreen, toggleFullscreen } = useFullscreen();

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), [setCollapsed]);
  const toggleFocus = useCallback(() => setFocus((f) => !f), [setFocus]);
  const exitFocus = useCallback(() => setFocus(false), [setFocus]);
  const toggleContentWidth = useCallback(
    () => setContentWidth((w) => (w === 'contained' ? 'full' : 'contained')),
    [setContentWidth],
  );

  // Focus mode removes the nav and the top bar, so Esc is the escape hatch that
  // doesn't depend on finding the floating exit button.
  useEffect(() => {
    if (!focus) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitFocus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focus, exitFocus]);

  return {
    collapsed,
    toggleCollapsed,
    focus,
    toggleFocus,
    exitFocus,
    contentWidth,
    toggleContentWidth,
    fullscreenSupported: supported,
    isFullscreen,
    toggleFullscreen,
  };
}
