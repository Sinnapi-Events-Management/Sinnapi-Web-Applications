import { useState } from 'react';
import { usePromotions as usePromotionsQuery } from '@/hooks/queries';

/**
 * The promotions list and the dialog state around it. The create form's own
 * state lives in `usePromotionForm`, mounted with the dialog.
 */
export function usePromotions(vendorId: string) {
  const { data, isLoading, error } = usePromotionsQuery(vendorId);
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
