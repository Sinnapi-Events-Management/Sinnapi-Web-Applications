import { useCallback, useMemo, useState } from 'react';
import { useUrlTab } from '@sinnapi/ui/profile';
import { useProfile as useProfileQuery } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { useAuth } from '@/auth/AuthProvider';
import { toProfileFormValues, PROFILE_TABS } from '../schema';

/**
 * Page-level state for the signed-in admin's own profile.
 *
 * Owns three things and nothing else: which section is showing (mirrored into the
 * query string by the shared `useUrlTab`, so `/profile?tab=security` deep-links),
 * the profile read, and the toast shown after a successful write. The actual
 * writes live in the focused hooks beside this one (`useProfileDetails`,
 * `useAvatarUpload`, `usePasswordChange`) so each concern owns its own busy and
 * error state.
 */
export function useProfile() {
  const { data: profile, isLoading, error } = useProfileQuery();
  const { roles } = useAdmin();
  const { user } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const { tab, setTab } = useUrlTab(PROFILE_TABS);

  // Referentially stable per profile revision: react-hook-form's `values` resets
  // the fields whenever this identity changes, so a new object every render would
  // fight the user's typing.
  const formValues = useMemo(() => toProfileFormValues(profile), [profile]);

  const displayName = profile?.full_name?.trim() || profile?.email || 'Your account';

  return {
    profile: profile ?? null,
    userId: profile?.id ?? user?.id ?? null,
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
