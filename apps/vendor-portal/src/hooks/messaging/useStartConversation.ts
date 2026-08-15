import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MESSAGING_KEYS } from '@/hooks/queries';

/**
 * Opens — creating on first use — a thread with a client or with Sinnapi
 * support, then navigates to it.
 *
 * Both are single find-or-create server calls. Two taps in quick succession
 * would otherwise open two threads with the same client, and the inbox is the
 * one place that mistake is permanent.
 *
 * Messaging a client is gated server-side on an existing booking or quotation
 * (see migration 0815g) — the platform does not offer cold outreach, and the
 * picker only ever lists people who pass the same test.
 */

type Target = { kind: 'client'; clientId: string } | { kind: 'support' };

const MESSAGES: Record<string, string> = {
  no_relationship: 'You can only message clients you have a booking or quotation with.',
  not_a_vendor: 'Your account is not set up as a vendor yet.',
  vendor_required: 'Choose which of your businesses this conversation is about.',
  client_not_found: 'This client could not be found.',
  account_unavailable: 'Your account is not currently able to start conversations.',
  forbidden: 'You do not have access to that business.',
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
        target.kind === 'client'
          ? await supabase.rpc('get_or_create_vendor_client_conversation', {
              p_client_id: target.clientId,
            })
          : await supabase.rpc('get_or_create_vendor_support_conversation');

      setBusy(false);

      if (rpcError || !data) {
        setError(explain(rpcError?.message));
        return null;
      }

      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.conversations });

      const id = data as string;
      navigate(`/messages/${id}`);
      return id;
    },
    [isBusy, qc, navigate],
  );

  return {
    messageClient: useCallback(
      (clientId: string | null | undefined) =>
        clientId ? open({ kind: 'client', clientId }) : Promise.resolve(null),
      [open],
    ),
    contactSupport: useCallback(() => open({ kind: 'support' }), [open]),
    isBusy,
    error,
    clearError: useCallback(() => setError(null), []),
  };
}
