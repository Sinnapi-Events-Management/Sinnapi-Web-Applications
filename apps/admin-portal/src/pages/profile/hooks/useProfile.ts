import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfile as useProfileQuery } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { useAuth } from '@/auth/AuthProvider';
import { toProfileFormValues, toProfileTab, type ProfileTab } from '../schema';

/**
 * Page-level state for the signed-in admin's own profile.
 *
 * Owns three things and nothing else: which section is showing (mirrored into
 * the query string so `/profile?tab=security` deep-links), the profile read, and
 * the toast shown after a successful write. The actual writes live in the
 * focused hooks beside this one (`useProfileDetails`, `useAvatarUpload`,
 * `usePasswordChange`) so each concern owns its own busy/error state.
 */
export function useProfile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: profile, isLoading, error } = useProfileQuery();
  const { roles } = useAdmin();
  const { user } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);

  const tab = toProfileTab(searchParams.get('tab'));

  const setTab = useCallback(
    (next: ProfileTab) => {
      // `replace` keeps tab switching out of the history stack, so Back still
      // returns to wherever the user came from rather than the other tab.
      setSearchParams(next === 'profile' ? {} : { tab: next }, { replace: true });
    },
    [setSearchParams],
  );

  // Referentially stable per profile revision: react-hook-form's `values` resets
  // the fields whenever this identity changes, so a new object every render
  // would fight the user's typing.
  const formValues = useMemo(() => toProfileFormValues(profile), [profile]);

  const displayName = profile?.full_name?.trim() || profile?.email || 'Your account';

  return {
    profile: profile ?? null,
    email: profile?.email ?? user?.email ?? null,
    roles,
    displayName,
    formValues,
    isLoading,
    error,
    tab,
    setTab,
    notice,
    setNotice,
    clearNotice: useCallback(() => setNotice(null), []),
  };
}
