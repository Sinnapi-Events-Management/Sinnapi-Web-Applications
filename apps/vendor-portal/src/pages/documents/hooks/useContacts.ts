import { useMemo, useState } from 'react';
import { useToast } from '@sinnapi/ui';
import { documentErrorMessage, type ContactRow } from '@sinnapi/ui/documents';
import { useDeleteContact, useVendorContacts } from '@/hooks/documentQueries';

/**
 * The Saved clients tab: the list, a client-side search (a vendor's saved
 * clients number in the tens, not thousands), and the add/edit/delete flow.
 */
export function useContacts(vendorId: string) {
  const query = useVendorContacts(vendorId);
  const remove = useDeleteContact(vendorId);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ContactRow | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ContactRow | null>(null);

  const contacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = query.data ?? [];
    if (!term) return all;
    return all.filter((c) =>
      [c.full_name, c.company_name, c.email, c.phone].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [query.data, search]);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`${deleting.full_name} removed from your saved clients`);
      setDeleting(null);
    } catch (e) {
      toast.error(documentErrorMessage(e, 'This client could not be removed.'));
    }
  }

  return {
    contacts,
    hasAny: (query.data ?? []).length > 0,
    isLoading: query.isLoading,
    error: query.error,
    search,
    setSearch,
    /** `undefined` closed, `null` adding, a row editing. */
    editing,
    openAdd: () => setEditing(null),
    openEdit: (c: ContactRow) => setEditing(c),
    closeEditor: (saved?: string) => {
      setEditing(undefined);
      if (saved) toast.success(saved);
    },
    deleting,
    askDelete: setDeleting,
    cancelDelete: () => setDeleting(null),
    confirmDelete,
    deleteBusy: remove.isPending,
    toast: toast.toast,
    dismissToast: toast.dismiss,
  };
}
