import { useEffect } from 'react';

/**
 * Asks the browser to confirm a reload or tab close while `when` holds.
 *
 * Covers the page being unloaded only. In-app navigation is not intercepted: the
 * portals mount a plain `BrowserRouter`, and `useBlocker` needs a data router.
 */
export function useLeaveGuard(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome still requires returnValue to be set for the prompt to show.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);
}
