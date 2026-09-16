import { useCallback, useEffect, useState } from 'react';
import { useUrlTab } from '@sinnapi/ui/profile';
import { PROFILE_TABS, type ProfileTab } from '../schema';

/**
 * Page-level state: which section is showing, and the toast shown after any of the
 * page's writes lands.
 *
 * Deliberately tiny. Every write on this page — business details, logo, personal
 * details, photo, coverage — owns its own busy and error state in its own hook, so
 * a failed logo upload can't disable the business form's Save button. All they
 * share is where the success message goes.
 *
 * `visited` keeps a tab mounted once it has been opened, so switching between
 * Business and Personal hides a tab instead of unmounting it — otherwise an
 * unsaved draft on one would vanish the moment the vendor glanced at the other.
 */
export function useProfilePage() {
  const [notice, setNotice] = useState<string | null>(null);
  const { tab, setTab } = useUrlTab(PROFILE_TABS);
  const [visited, setVisited] = useState<ReadonlySet<ProfileTab>>(() => new Set([tab]));

  useEffect(() => {
    setVisited((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  }, [tab]);

  return {
    tab,
    setTab,
    visited,
    notice,
    setNotice,
    clearNotice: useCallback(() => setNotice(null), []),
  };
}
