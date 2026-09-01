import { Alert, ConfirmDialog, QueryState, Toast } from '@sinnapi/ui';
import { useDiscounts } from '../../hooks/useDiscounts';
import { useDiscountActions } from '../../hooks/useDiscountActions';
import { useCopyCode } from '../../hooks/useCopyCode';
import DiscountsMetrics from './DiscountsMetrics';
import DiscountsToolbar from './DiscountsToolbar';
import DiscountGrid from './DiscountGrid';
import DiscountDialog from './DiscountDialog';

/**
 * The discounts screen for one vendor: what the codes add up to, the filters
 * over them, the codes themselves, and the two dialogs.
 *
 * All of the state is in three hooks — `useDiscounts` for the joined list and
 * the editor, `useDiscountActions` for the writes against a single card, and
 * `useCopyCode` for the clipboard — so this component is the arrangement and
 * nothing else. That split is what lets the layout change without anyone
 * re-reading how a code's status is derived, and keeps a pause on one card from
 * re-rendering the filter.
 *
 * `QueryState` guards the codes only. The campaigns read behind each card's
 * "part of" chip and the editor's attach picker is allowed to be slower or to
 * fail outright: the codes are the point of the screen, and a card missing one
 * chip is far better than a page showing nothing because a secondary query is
 * still in flight.
 *
 * The action error surfaces above the grid rather than on the card that caused
 * it. A refused write is usually about the code's state — a name another vendor
 * already holds, a permission — rather than its layout, and a card is already
 * carrying as much as it can hold.
 */
export default function DiscountsWorkspace({ vendorId }: { vendorId: string }) {
  const {
    visible,
    counts,
    kpis,
    filter,
    setFilter,
    term,
    setTerm,
    clearTerm,
    takenCodes,
    promotions,
    now,
    isLoading,
    error,
    isEmpty,
    isFiltered,
    editing,
    isEditorOpen,
    create,
    edit,
    editorWarning,
    dismissEditorWarning,
    closeEditor,
  } = useDiscounts(vendorId);

  const {
    busyId,
    error: actionError,
    dismissError,
    pending,
    setActive,
    duplicate,
    requestDelete,
    cancelPending,
    confirmPending,
  } = useDiscountActions(vendorId);

  const { copy, copied, toast, dismissToast } = useCopyCode();

  return (
    <>
      <DiscountsMetrics kpis={kpis} hidden={isEmpty} />

      <DiscountsToolbar
        filter={filter}
        counts={counts}
        term={term}
        onFilter={setFilter}
        onTerm={setTerm}
        onClearTerm={clearTerm}
        onCreate={create}
      />

      {actionError && (
        <Alert severity="error" onClose={dismissError} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {/* The code saved; what it covers did not. Warning rather than error: the
          vendor's work is not lost, and the code is live on their whole
          catalogue until they reopen it and narrow the scope. */}
      {editorWarning && (
        <Alert severity="warning" onClose={dismissEditorWarning} sx={{ mb: 2 }}>
          {editorWarning} The discount was saved and currently applies to everything you sell — open
          it again to choose which packages it covers.
        </Alert>
      )}

      <QueryState isLoading={isLoading} error={error}>
        <DiscountGrid
          discounts={visible}
          now={now}
          busyId={busyId}
          copiedCode={copied}
          isFiltered={isFiltered}
          onCopy={copy}
          onCreate={create}
          onEdit={edit}
          onDuplicate={(discount) => duplicate(discount, takenCodes)}
          onToggleActive={(discount) => setActive(discount, discount.status === 'paused')}
          onDelete={requestDelete}
        />
      </QueryState>

      <DiscountDialog
        open={isEditorOpen}
        vendorId={vendorId}
        discount={editing}
        promotions={promotions}
        onClose={closeEditor}
      />

      <ConfirmDialog
        open={pending !== null}
        title="Delete this discount?"
        description={
          pending
            ? `${pending.discount.code ? `"${pending.discount.code}"` : 'This automatic discount'} will stop being redeemable, and any client who already has it will be turned down. The bookings it already priced are unaffected, and the code becomes free to issue again later.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={pending !== null && busyId === pending.discount.id}
        onConfirm={confirmPending}
        onCancel={cancelPending}
      />

      <Toast toast={toast} onClose={dismissToast} />
    </>
  );
}
