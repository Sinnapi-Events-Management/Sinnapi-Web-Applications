import { useCallback, useMemo, useState } from 'react';
import { useProfile as useProfileQuery } from '@/hooks/queries';
import { toProfileFormValues } from '../schema';

/**
 * Page-level state for the signed-in client's own profile.
 *
 * Owns two things and nothing else: the profile read, and the toast shown after a
 * successful write. Both writes on this page live in a focused hook beside this
 * one (`useProfileDetails`, `useClientAvatar`) so each carries its own busy and
 * error state — a failed name save must not blank the photo card's spinner, and a
 * failed upload must not disable the form's Save button.
 */
export function useProfile() {
  const { data: profile, isLoading, error } = useProfileQuery();
  const [notice, setNotice] = useState<string | null>(null);

  // Referentially stable per profile revision: react-hook-form's `values` resets
  // the fields whenever this identity changes, so a new object every render would
  // fight the user's typing.
  const formValues = useMemo(() => toProfileFormValues(profile), [profile]);

  const displayName = profile?.full_name?.trim() || profile?.email || 'Your account';

  return {
    profile: profile ?? null,
    isLoading,
    error,
    displayName,
    formValues,
    notice,
    setNotice,
    clearNotice: useCallback(() => setNotice(null), []),
  };
}
