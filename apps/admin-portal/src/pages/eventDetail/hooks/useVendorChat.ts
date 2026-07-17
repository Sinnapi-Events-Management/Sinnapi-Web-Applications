import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { VendorLike } from './useEventVendorDecision';

/** The vendor whose thread is open in the chat drawer. */
export type ChatTarget = { vendorId: string; businessName: string | null };

/**
 * Drives the in-page vendor⇄admin chat drawer. Opening a vendor resolves (or
 * opens) the conversation scoped to this event + vendor via
 * `admin_event_vendor_thread` — so every message stays attached to the event —
 * and hands back the conversation id the drawer's thread + composer read. The
 * admin never leaves the event page.
 */
export function useVendorChat(eventId: string) {
  const [target, setTarget] = useState<ChatTarget | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    async (vendor: VendorLike) => {
      setTarget({ vendorId: vendor.vendor_id, businessName: vendor.business_name });
      setConversationId(null);
      setError(null);
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('admin_event_vendor_thread', {
        p_event_id: eventId,
        p_vendor_id: vendor.vendor_id,
      });
      setLoading(false);
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      setConversationId(data as string);
    },
    [eventId],
  );

  const close = useCallback(() => {
    setTarget(null);
    setConversationId(null);
    setError(null);
  }, []);

  return { target, conversationId, loading, error, isOpen: target !== null, open, close };
}
