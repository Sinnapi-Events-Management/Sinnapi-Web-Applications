import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useMessageThread } from '@/hooks/useMessageThread';

/** Binds the `/messages/:conversationId` route param to the shared thread hook. */
export function useConversation() {
  const { conversationId = '' } = useParams();

  // A conversation id is meaningless in a breadcrumb, and the thread payload
  // carries no counterparty name, so the crumb stays generic.
  useBreadcrumbTitle('Conversation');

  return { conversationId, ...useMessageThread(conversationId) };
}
