import { useCallback, useState } from 'react';
import { useStartConversation } from '@/hooks/messaging/useStartConversation';

/**
 * The "new conversation" flow for a vendor.
 *
 * Contacting Sinnapi goes straight through — there is one support thread per
 * business and the RPC resolves it. Messaging a client needs the picker first,
 * so only that branch opens a dialog.
 */
export function useNewConversation() {
  const { messageClient, contactSupport, isBusy, error, clearError } = useStartConversation();
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const pickClient = useCallback(() => {
    clearError();
    setClientPickerOpen(true);
  }, [clearError]);

  const start = useCallback(
    async (clientId: string) => {
      const id = await messageClient(clientId);
      // Closed only on success, so a refusal keeps the reason on screen instead
      // of dismissing the dialog and leaving the vendor guessing.
      if (id) setClientPickerOpen(false);
    },
    [messageClient],
  );

  return {
    clientPickerOpen,
    pickClient,
    closeClientPicker: useCallback(() => setClientPickerOpen(false), []),
    messageClient: start,
    contactSupport,
    isBusy,
    error,
    clearError,
  };
}
