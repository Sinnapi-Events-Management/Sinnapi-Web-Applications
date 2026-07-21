import { useParams } from 'react-router-dom';
import { useMessageThread } from '@/hooks/useMessageThread';

/** Binds the `/messages/:conversationId` route param to the shared thread hook. */
export function useConversation() {
  const { conversationId = '' } = useParams();
  return { conversationId, ...useMessageThread(conversationId) };
}
