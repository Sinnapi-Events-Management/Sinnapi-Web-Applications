import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingCategoryDelete } from '../../hooks/useCategoryDelete';

type Props = {
  /** The category awaiting confirmation; null keeps the dialog closed. */
  pending: PendingCategoryDelete | null;
  busy: boolean;
  /** Delete failure (e.g. subcategories or vendor services still attached), surfaced in the dialog. */
  err: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Category-specific copy for a delete. The delete is permanent —
 * `service_categories` has no soft-delete column — and is blocked by the
 * database while a subcategory, vendor, application, or vendor service still
 * references it (see `useCategoryDelete`).
 */
export default function CategoryDeleteDialog({ pending, busy, err, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this category';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Delete ${name}?`}
      message={
        <>
          <strong>{name}</strong> will be permanently removed. This can’t be undone. If any
          subcategory, vendor, or vendor service still references it, deactivate it instead.
          {err && (
            <>
              <br />
              <br />
              {err}
            </>
          )}
        </>
      }
      confirmLabel="Delete category"
      confirmColor="error"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
