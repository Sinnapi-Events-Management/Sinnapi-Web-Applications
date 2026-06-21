import { useParams } from 'react-router-dom';
import { useMessages } from '@/hooks/queries';
import { useAuth } from '@/auth/AuthProvider';

export function useConversation() {
  const { conversationId = '' } = useParams();
  const { user } = useAuth();
  const { data, isLoading, error } = useMessages(conversationId);
  const messages = data ?? [];

  return { conversationId, user, messages, isLoading, error };
}
