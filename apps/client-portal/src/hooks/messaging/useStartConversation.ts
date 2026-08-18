import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MESSAGING_KEYS } from '@/hooks/queries';

/**
 * Opens — creating on first use — a thread with a vendor or with Sinnapi
 * support, then navigates to it.
 *
 * FIND-OR-CREATE IS ONE SERVER CALL, never a lookup here followed by an insert.
 * Two taps in quick succession would otherwise open two threads with the same
 * vendor, and the inbox is the one place that mistake is permanent: the client
 * ends up with a list of duplicate titles holding one message each. The RPCs
 * also resolve the counterparty themselves, so no client screen has to read
 * `vendors.owner_id` just to hand it back.
 *
 * Navigation only happens on success. Dropping someone on `/messages/` with no
 * id is a worse failure than staying put with a sentence explaining why.
 */

type Target =
  | { kind: 'vendor'; vendorId: string }
  /** The client's single durable thread with the Sinnapi team. */
  | { kind: 'support' };

const MESSAGES: Record<string, string> = {
  vendor_unavailable: 'This vendor is not currently accepting messages.',
  vendor_not_found: 'This vendor could not be found.',
  not_a_client: 'Your account cannot open a support conversation.',
  account_unavailable: 'Your account is not currently able to start conversations.',
};

function explain(message: string | undefined) {
  const key = Object.keys(MESSAGES).find((k) => message?.includes(k));
  return key ? MESSAGES[key] : 'The conversation could not be opened. Please try again.';
}

export function useStartConversation() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    async (target: Target) => {
      if (isBusy) return null;
      setBusy(true);
      setError(null);

      const { data, error: rpcError } =
        target.kind === 'vendor'
          ? await supabase.rpc('get_or_create_client_vendor_conversation', {
              p_vendor_id: target.vendorId,
            })
          : await supabase.rpc('get_or_create_client_support_conversation');

      setBusy(false);

      if (rpcError || !data) {
        setError(explain(rpcError?.message));
        return null;
      }

      // A first message opens a thread the inbox has never seen.
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.conversations });
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.unread });

      const id = data as string;
      navigate(`/messages/${id}`);
      return id;
    },
    [isBusy, qc, navigate],
  );

  return {
    /** Message a specific vendor. */
    messageVendor: useCallback(
      (vendorId: string | null | undefined) =>
        vendorId ? open({ kind: 'vendor', vendorId }) : Promise.resolve(null),
      [open],
    ),
    /** Open the client's support thread with the Sinnapi team. */
    contactSupport: useCallback(() => open({ kind: 'support' }), [open]),
    isBusy,
    error,
    clearError: useCallback(() => setError(null), []),
  };
}
