import { useProfile } from '@/hooks/queries';

/**
 * The profile read behind the settings page. Editing it is `useAccountForm`,
 * which is mounted once the profile has actually loaded.
 */
export function useSettings() {
  const { data: profile, isLoading, error } = useProfile();
  return { profile, isLoading, error };
}
