import { useMyEvents as useMyEventsQuery } from '@/hooks/queries';

export function useMyEvents() {
  const { data, isLoading, error } = useMyEventsQuery();
  const rows = data ?? [];

  return { rows, isLoading, error };
}
