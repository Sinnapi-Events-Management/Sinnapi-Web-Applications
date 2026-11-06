import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { documentErrorMessage } from '@sinnapi/ui/documents';
import { sendFinancialDocument, type SendTarget } from './sendFinancialDocument';

/**
 * One tap: email a document only to the vendor's own account address.
 * Nothing reaches the client, and it does not use up the daily email limit.
 *
 * `sendingId` is the document in flight, so a list can show a spinner on
 * the right row and keep the others usable.
 */
export function useSendToSelf(handlers: {
  onSent: (recipient: string) => void;
  onError: (message: string) => void;
}) {
  const qc = useQueryClient();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { onSent, onError } = handlers;

  const send = useCallback(
    async (target: SendTarget | null) => {
      if (!target || sendingId) return;
      setSendingId(target.id);
      try {
        const recipient = await sendFinancialDocument(target, {
          to: 'self',
          ccSelf: false,
          message: null,
          requestKey: crypto.randomUUID(),
        });
        onSent(recipient ?? 'your email');
      } catch (e) {
        onError(documentErrorMessage(e, 'The email could not be sent. Try again shortly.'));
      } finally {
        void qc.invalidateQueries({ queryKey: ['v-doc-deliveries', target.kind, target.id] });
        setSendingId(null);
      }
    },
    [qc, sendingId, onSent, onError],
  );

  return { send, sendingId };
}
