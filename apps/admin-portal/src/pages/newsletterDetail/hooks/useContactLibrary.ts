import { useCallback, useState } from 'react';
import { useContactLists, useDeleteContactList, useSaveContactList } from '@/hooks/queries';
import type { ContactListModel, ContactListSaveResult, NewsletterContact } from '@/lib/types';

export type ContactLibraryApi = ReturnType<typeof useContactLibrary>;

/** RPC error codes mapped to copy an operator can act on. */
const SAVE_MESSAGES: Record<string, string> = {
  list_title_taken:
    'An address book with that title already exists. Pick it from the list to add to it, or choose another title.',
  list_title_required: 'Give this address book a title.',
  list_not_found: 'That address book no longer exists.',
  forbidden: 'You do not have permission to manage address books.',
};

function friendly(message: string | undefined): string {
  const key = Object.keys(SAVE_MESSAGES).find((k) => message?.includes(k));
  return key ? SAVE_MESSAGES[key] : (message ?? 'That address book could not be saved.');
}

/**
 * The saved address books, and the act of adding to them.
 *
 * ── Why saving is a separate, named step ──────────────────────────────────
 * Autosaving every upload into a book would fill the library with "Book 1",
 * "Book 2", "Copy of vendors (3)" inside a month, and none of them would answer
 * the question that gets asked later: who are these people and where did they
 * come from. A title and a description are cheap to ask for at the moment the
 * operator still knows the answer, and worthless to ask for afterwards. So the
 * save is explicit, and it demands both.
 *
 * ── Merge, not replace ────────────────────────────────────────────────────
 * Saving into an existing book adds and updates; it never removes. Re-uploading
 * a corrected spreadsheet is the common case, and reading that gesture as
 * "delete everyone not in this file" is the destructive interpretation of an
 * ambiguous act. Taking somebody out is its own deliberate gesture.
 */
export function useContactLibrary() {
  const [search, setSearch] = useState('');
  const { data: lists = [], isLoading } = useContactLists(search || undefined);

  const saveMutation = useSaveContactList();
  const deleteMutation = useDeleteContactList();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<NewsletterContact[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<ContactListSaveResult | null>(null);

  /** Open the dialog for a specific set of contacts — typed, imported, or both. */
  const openSaveDialog = useCallback((contacts: NewsletterContact[]) => {
    setPending(contacts);
    setSaveError(null);
    setLastSaved(null);
    setDialogOpen(true);
  }, []);

  const closeSaveDialog = useCallback(() => {
    setDialogOpen(false);
    setSaveError(null);
  }, []);

  const save = useCallback(
    async (input: {
      title: string;
      description: string;
      /** An existing book to merge into, or null to create one. */
      listId: string | null;
    }): Promise<ContactListSaveResult | null> => {
      setSaveError(null);
      try {
        const result = await saveMutation.mutateAsync({
          title: input.title.trim(),
          description: input.description.trim() || null,
          contacts: pending,
          listId: input.listId,
        });
        setLastSaved(result);
        setDialogOpen(false);
        return result;
      } catch (e) {
        setSaveError(friendly(e instanceof Error ? e.message : undefined));
        return null;
      }
    },
    [pending, saveMutation],
  );

  // Deleting a book is confirmed rather than undoable: the rows are gone, and
  // the campaigns already built from them are not affected, so there is nothing
  // an undo could restore except the book itself.
  const [deleting, setDeleting] = useState<ContactListModel | null>(null);

  const confirmDelete = useCallback(async () => {
    if (!deleting) return null;
    const removed = deleting;
    await deleteMutation.mutateAsync(removed.id);
    setDeleting(null);
    return removed;
  }, [deleting, deleteMutation]);

  return {
    lists,
    isLoading,
    search,
    setSearch,

    dialogOpen,
    pendingCount: pending.length,
    openSaveDialog,
    closeSaveDialog,
    save,
    saving: saveMutation.isPending,
    saveError,
    lastSaved,
    dismissLastSaved: () => setLastSaved(null),

    deleting,
    askDelete: setDeleting,
    cancelDelete: () => setDeleting(null),
    confirmDelete,
    removing: deleteMutation.isPending,
  };
}
