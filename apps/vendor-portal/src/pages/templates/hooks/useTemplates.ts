import { useState } from 'react';
import { useTemplates as useTemplatesQuery } from '@/hooks/queries';

/**
 * The templates list and the dialog state around it. The create form's own
 * state lives in `useTemplateForm`, mounted with the dialog.
 */
export function useTemplates(vendorId: string) {
  const { data, isLoading, error } = useTemplatesQuery(vendorId);
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
