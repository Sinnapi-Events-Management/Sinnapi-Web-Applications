import { useMessages } from '@/hooks/queries';
import { useAuth } from '@/auth/AuthProvider';

/**
 * Everything <MessageThread /> needs for one conversation: the message history
 * plus the viewer's id, so bubbles can be attributed. Shared by the inbox's
 * thread pane and the standalone conversation route.
 */
export function useMessageThread(conversationId: string) {
  const { user } = useAuth();
  const { data, isLoading, error } = useMessages(conversationId);

  return {
    messages: data ?? [],
    currentUserId: user?.id,
    isLoading,
    error,
  };
}
