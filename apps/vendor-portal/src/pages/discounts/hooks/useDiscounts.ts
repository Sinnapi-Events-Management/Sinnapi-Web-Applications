import { useState } from 'react';
import { useTableState } from '@sinnapi/ui';
import { useDiscounts as useDiscountsQuery } from '@/hooks/queries';

/**
 * The discounts list and the dialog state around it: server-paginated page
 * state plus whether the create dialog is open. The create form's own state
 * lives in `useDiscountForm`, mounted with the dialog.
 */
export function useDiscounts(vendorId: string) {
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useDiscountsQuery(vendorId, table.params);
  const [open, setOpen] = useState(false);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    open,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false),
  };
}
