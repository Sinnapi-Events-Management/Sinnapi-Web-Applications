import { useProfile as useProfileQuery } from '@/hooks/queries';

export function useProfile() {
  const { data: profile, isLoading, error } = useProfileQuery();

  return { profile, isLoading, error };
}
