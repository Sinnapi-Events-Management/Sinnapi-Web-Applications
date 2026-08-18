import { useCallback, useState } from 'react';
import { useUrlTab } from '@sinnapi/ui/profile';
import { PROFILE_TABS } from '../schema';

/**
 * Page-level state: which section is showing, and the toast shown after any of the
 * page's writes lands.
 *
 * Deliberately tiny. Every write on this page — business details, logo, personal
 * details, photo, coverage — owns its own busy and error state in its own hook, so
 * a failed logo upload can't disable the business form's Save button. All they
 * share is where the success message goes.
 */
export function useProfilePage() {
  const [notice, setNotice] = useState<string | null>(null);
  const { tab, setTab } = useUrlTab(PROFILE_TABS);

  return {
    tab,
    setTab,
    notice,
    setNotice,
    clearNotice: useCallback(() => setNotice(null), []),
  };
}
