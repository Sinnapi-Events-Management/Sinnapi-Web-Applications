import { useCallback } from 'react';
import { useProfileDirectory, useVendorReviews } from '@/hooks/queries';

export function useReviews(vendorId: string) {
  const { data, isLoading, error } = useVendorReviews(vendorId);
  const rows = data ?? [];

  // A review carries only its author's id — RLS keeps the profile row out of an
  // embed — so the names for the page come back in one directory call. Every
  // reviewer has a completed booking with this vendor, so all of them resolve.
  const { profiles } = useProfileDirectory(rows.map((r) => r.client_id));

  const clientName = useCallback(
    (id: string | null) => (id && profiles[id]?.full_name) || 'Client',
    [profiles],
  );

  return { rows, clientName, isLoading, error };
}
