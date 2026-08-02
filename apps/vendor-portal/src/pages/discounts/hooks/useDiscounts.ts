import { useState } from 'react';
import { useDiscounts as useDiscountsQuery } from '@/hooks/queries';

/**
 * The discounts list and the dialog state around it. The create form's own
 * state lives in `useDiscountForm`, mounted with the dialog.
 */
export function useDiscounts(vendorId: string) {
  const { data, isLoading, error } = useDiscountsQuery(vendorId);
  const [open, setOpen] = useState(false);

  return {
    rows: data ?? [],
    isLoading,
    error,
    open,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false),
  };
}
