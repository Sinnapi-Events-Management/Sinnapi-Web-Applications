import { useConversations } from '@/hooks/queries';

export function useMessages() {
  const { data, isLoading, error } = useConversations();
  const rows = data ?? [];

  return {
    rows,
    isLoading,
    error,
  };
}
