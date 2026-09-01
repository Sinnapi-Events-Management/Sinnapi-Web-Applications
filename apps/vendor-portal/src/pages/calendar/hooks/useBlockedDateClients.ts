import { useCallback, useMemo } from 'react';
import { useProfileDirectory } from '@/hooks/queries';
import { bookingClientIds } from '../schema';
import type { BlockedDateModel } from '@/lib/types';

/**
 * Puts a name to the client behind each booking-derived block.
 *
 * Its own read rather than an embed: `profiles_self_read` restricts the table to
 * the caller's own row, so a `profiles:client_id(full_name)` join resolves to
 * null for every client a vendor has. `get_profile_directory` behind
 * `useProfileDirectory` is the sanctioned way across that boundary, and it only
 * discloses people the vendor already shares work with.
 *
 * The resolver is stable while the names are, so the tooltips built from it are
 * not rebuilt — and the grid holding them is not remounted — on every render.
 */
export function useBlockedDateClients(rows: BlockedDateModel[]) {
  const clientIds = useMemo(() => bookingClientIds(rows), [rows]);
  // `profiles` is the query's own data object: new identity only when the names
  // themselves change.
  const { profiles } = useProfileDirectory(clientIds);

  return useCallback(
    (id: string | null | undefined) => (id ? (profiles[id]?.full_name ?? null) : null),
    [profiles],
  );
}

export type ClientNameResolver = ReturnType<typeof useBlockedDateClients>;
