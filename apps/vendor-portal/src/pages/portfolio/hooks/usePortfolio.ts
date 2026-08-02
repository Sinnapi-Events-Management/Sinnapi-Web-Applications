import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMedia } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

/**
 * The gallery, its deletions, and the add-dialog state. The add form's own
 * state lives in `useMediaForm`, mounted with the dialog.
 */
export function usePortfolio(vendorId: string) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useMedia(vendorId);
  const [open, setOpen] = useState(false);

  async function remove(id: string) {
    await supabase.from('vendor_media').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['v-media', vendorId] });
  }

  return {
    rows: data ?? [],
    isLoading,
    error,
    open,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false),
    remove,
  };
}
