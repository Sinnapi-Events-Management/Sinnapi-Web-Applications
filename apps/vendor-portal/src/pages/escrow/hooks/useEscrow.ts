import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import { useProfileDirectory, useVendorEscrow } from '@/hooks/queries';
import { one } from '@/lib/rel';
import type { EscrowBookingRel, EscrowModel } from '@/lib/types';

/** The vendor's held money, newest first, with each client's name resolved. */
export function useEscrow(vendorId: string) {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useVendorEscrow(vendorId, table.params);
  const rows = data?.rows ?? [];

  const { profiles, isLoading: namesLoading } = useProfileDirectory(
    rows.map((e) => one<EscrowBookingRel>(e.bookings)?.client_id ?? null),
  );
  const clientName = useCallback(
    (e: EscrowModel) => {
      const id = one<EscrowBookingRel>(e.bookings)?.client_id;
      return (id && profiles[id]?.full_name) || 'Client';
    },
    [profiles],
  );

  return {
    rows,
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    clientName,
    namesLoading,
    open: (e: EscrowModel) => {
      const id = one<EscrowBookingRel>(e.bookings)?.id;
      if (id) navigate(`/bookings/${id}?tab=money`);
    },
  };
}
