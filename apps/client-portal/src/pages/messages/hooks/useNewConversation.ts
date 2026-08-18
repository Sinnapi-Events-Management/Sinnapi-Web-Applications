import { useCallback, useState } from 'react';
import { useStartConversation } from '@/hooks/messaging/useStartConversation';

/**
 * The "new conversation" flow, split from `useMessagesPage` because it is
 * modal state rather than inbox state.
 *
 * Contacting Sinnapi goes straight through — there is nothing to choose, the
 * client has exactly one support thread and the RPC resolves it. Messaging a
 * vendor needs the picker first, so only that branch opens a dialog.
 */
export function useNewConversation() {
  const { messageVendor, contactSupport, isBusy, error, clearError } = useStartConversation();
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);

  const pickVendor = useCallback(() => {
    clearError();
    setVendorPickerOpen(true);
  }, [clearError]);

  const closeVendorPicker = useCallback(() => setVendorPickerOpen(false), []);

  const start = useCallback(
    async (vendorId: string) => {
      const id = await messageVendor(vendorId);
      // Closed only on success: a failure keeps the dialog open with the reason
      // in it, so the reader is not left guessing why nothing happened.
      if (id) setVendorPickerOpen(false);
    },
    [messageVendor],
  );

  return {
    vendorPickerOpen,
    pickVendor,
    closeVendorPicker,
    messageVendor: start,
    contactSupport,
    isBusy,
    error,
    clearError,
  };
}
