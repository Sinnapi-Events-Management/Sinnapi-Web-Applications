import { ConfirmDialog, Toast } from '@sinnapi/ui';
import type { ContactListModel } from '@/lib/types';
import type { ContactLibraryApi } from '../../hooks/useContactLibrary';
import { savedListNotice } from '../../schema';
import SaveContactListDialog from './SaveContactListDialog';

type Props = {
  library: ContactLibraryApi;
  /** Called once a book is actually gone, so a picker pointing at it can let go. */
  onDeleted: (list: ContactListModel) => void;
};

/**
 * Everything the address-book library says back to the operator: the save
 * dialog, the delete confirmation and the result of a save.
 *
 * Kept together and away from the sections because none of it belongs to any
 * one source — a save is started from the by-hand list or from a spreadsheet,
 * and a delete from the book picker, but all three end here. Any section can
 * open them by handing `useContactLibrary` some contacts.
 */
export default function ContactLibraryDialogs({ library, onDeleted }: Props) {
  return (
    <>
      <SaveContactListDialog
        open={library.dialogOpen}
        count={library.pendingCount}
        lists={library.lists}
        saving={library.saving}
        error={library.saveError}
        onCancel={library.closeSaveDialog}
        onSave={(input) => void library.save(input)}
      />

      <ConfirmDialog
        open={Boolean(library.deleting)}
        title={`Delete “${library.deleting?.title ?? ''}”?`}
        description={`Its ${(library.deleting?.contact_count ?? 0).toLocaleString()} contacts are removed with it. Campaigns already sent to these people keep their own record and are not affected.`}
        confirmLabel="Delete address book"
        destructive
        loading={library.removing}
        onCancel={library.cancelDelete}
        onConfirm={() => {
          void library.confirmDelete().then((removed) => {
            if (removed) onDeleted(removed);
          });
        }}
      />

      <Toast
        toast={
          library.lastSaved
            ? { message: savedListNotice(library.lastSaved), severity: 'success' }
            : null
        }
        onClose={library.dismissLastSaved}
      />
    </>
  );
}
