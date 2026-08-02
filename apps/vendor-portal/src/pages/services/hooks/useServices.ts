import { useState } from 'react';
import { useServices as useServicesQuery } from '@/hooks/queries';

/**
 * The services list and the dialog state around it. The create form's own state
 * lives in `useServiceForm`, mounted with the dialog.
 */
export function useServices(vendorId: string) {
  const { data, isLoading, error } = useServicesQuery(vendorId);
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
