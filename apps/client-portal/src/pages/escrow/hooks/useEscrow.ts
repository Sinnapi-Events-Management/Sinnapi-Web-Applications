import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import { useEscrow as useEscrowQuery } from '@/hooks/queries';

/**
 * The client's escrow list.
 *
 * Subscribed rather than polled: funding confirmations, advance releases and
 * admin approvals all land server-side, so this page changes without the
 * client doing anything. RLS already scopes the stream to their own rows.
 */
export function useEscrow() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useEscrowQuery();

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['escrow'] });
  }, [qc]);

  useRealtimeRefresh({
    client: supabase,
    channel: 'client-escrow-list',
    onChange: refresh,
    watch: ESCROW_WATCH,
  });

  return { rows: data ?? [], isLoading, error, refresh };
}

// Module-level so the identity is stable across renders.
const ESCROW_WATCH = [{ table: 'escrow_transactions' }];
