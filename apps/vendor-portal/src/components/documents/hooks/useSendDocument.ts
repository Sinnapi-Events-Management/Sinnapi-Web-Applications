import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { documentErrorMessage } from '@sinnapi/ui/documents';
import { sendFinancialDocument, type SendTarget } from './sendFinancialDocument';

export type { SendTarget } from './sendFinancialDocument';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Who the dialog sends to: the client's Sinnapi account, an address, or only the vendor. */
export type SendMode = 'account' | 'address' | 'self';

/** The fixed recipients; `address` sends to whatever was typed. */
const RECIPIENT: Partial<Record<SendMode, 'client_account' | 'self'>> = {
  account: 'client_account',
  self: 'self',
};
const FALLBACK_LABEL: Partial<Record<SendMode, string>> = {
  account: 'their Sinnapi email',
  self: 'you',
};

/**
 * The "Email" dialog's state. One request key per open dialog: a
 * double-click, or a retry after a lost response, is recognised by the
 * server and sends nothing twice.
 */
export function useSendDocument(target: SendTarget, onSent: (recipient: string) => void) {
  const qc = useQueryClient();
  const [requestKey] = useState(() => crypto.randomUUID());
  const [mode, setMode] = useState<SendMode>(target.hasClientAccount ? 'account' : 'address');
  const [address, setAddress] = useState(target.savedEmail ?? '');
  const [message, setMessage] = useState('');
  const [ccSelf, setCcSelf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addressValid = EMAIL_RE.test(address.trim());
  const canSend = !busy && (mode !== 'address' || addressValid) && message.length <= 2000;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    const to = RECIPIENT[mode] ?? address.trim().toLowerCase();
    try {
      const recipient = await sendFinancialDocument(target, {
        to,
        ccSelf,
        message: message.trim() || null,
        requestKey,
      });
      onSent(recipient ?? FALLBACK_LABEL[mode] ?? address.trim());
    } catch (e) {
      setError(documentErrorMessage(e, 'The email could not be sent. Try again shortly.'));
    } finally {
      // A failed send is still recorded in the history; refresh it either way.
      void qc.invalidateQueries({ queryKey: ['v-doc-deliveries', target.kind, target.id] });
      setBusy(false);
    }
  }

  return {
    mode,
    setMode,
    address,
    setAddress,
    addressValid,
    message,
    setMessage,
    ccSelf,
    setCcSelf,
    busy,
    error,
    canSend,
    send,
  };
}
