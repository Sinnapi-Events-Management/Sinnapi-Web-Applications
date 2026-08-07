import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useMessages } from '@/hooks/queries';
import { useAuth } from '@/auth/AuthProvider';

export function useConversation() {
  const { conversationId = '' } = useParams();
  const { user } = useAuth();
  const { data, isLoading, error } = useMessages(conversationId);
  const messages = data ?? [];

  // A conversation id is meaningless in a breadcrumb, and the thread payload
  // carries no counterparty name, so the crumb stays generic.
  useBreadcrumbTitle('Conversation');

  return { conversationId, user, messages, isLoading, error };
}
