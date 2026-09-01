import { Alert, QueryState } from '@sinnapi/ui';
import { ConfirmDialog } from '@sinnapi/ui';
import { usePromotions } from '../../hooks/usePromotions';
import { usePromotionActions } from '../../hooks/usePromotionActions';
import PromotionsMetrics from './PromotionsMetrics';
import PromotionsToolbar from './PromotionsToolbar';
import PromotionGrid from './PromotionGrid';
import PromotionDialog from './PromotionDialog';

/**
 * The promotions screen for one vendor: what the campaigns add up to, the
 * filter over them, the campaigns themselves, and the two dialogs.
 *
 * All of the state is in two hooks — `usePromotions` for the joined list and
 * the editor, `usePromotionActions` for the writes against a single card — so
 * this component is the arrangement and nothing else. That split is what lets
 * the layout change without anyone re-reading how a campaign's status is
 * derived, and keeps a pause on one card from re-rendering the filter.
 *
 * `QueryState` guards the campaigns only. The codes read behind each card's
 * redemption line is allowed to be slower or to fail outright: the campaigns
 * are the point of the screen, and a card showing a skeleton where its
 * redemptions go is far better than a page showing nothing because a secondary
 * query is still in flight.
 *
 * The action error surfaces above the grid rather than on the card that caused
 * it. A refused write is usually about the campaign's state rather than its
 * layout, and a card is already carrying as much as it can hold.
 */
export default function PromotionsWorkspace({ vendorId }: { vendorId: string }) {
  const {
    visible,
    counts,
    kpis,
    filter,
    setFilter,
    now,
    isLoading,
    error,
    codesLoading,
    isEmpty,
    isFiltered,
    editing,
    isEditorOpen,
    editorWarning,
    dismissEditorWarning,
    create,
    edit,
    closeEditor,
  } = usePromotions(vendorId);

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
  } = usePromotionActions(vendorId);

  return (
    <>
      <PromotionsMetrics kpis={kpis} loading={codesLoading} hidden={isEmpty} />

      <PromotionsToolbar filter={filter} counts={counts} onFilter={setFilter} onCreate={create} />

      {actionError && (
        <Alert severity="error" onClose={dismissError} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {/* The campaign saved; what it covers did not. Warning rather than error:
          the vendor's work is not lost, and the campaign is live on their whole
          catalogue until they reopen it and narrow the scope. */}
      {editorWarning && (
        <Alert severity="warning" onClose={dismissEditorWarning} sx={{ mb: 2 }}>
          {editorWarning} The campaign was saved and currently applies to everything you sell — open
          it again to choose which packages it covers.
        </Alert>
      )}

      <QueryState isLoading={isLoading} error={error}>
        <PromotionGrid
          promotions={visible}
          now={now}
          busyId={busyId}
          codesLoading={codesLoading}
          isFiltered={isFiltered}
          onCreate={create}
          onEdit={edit}
          onDuplicate={duplicate}
          onToggleActive={(promotion) => setActive(promotion, promotion.status === 'paused')}
          onDelete={requestDelete}
        />
      </QueryState>

      <PromotionDialog
        open={isEditorOpen}
        vendorId={vendorId}
        promotion={editing}
        onClose={closeEditor}
      />

      <ConfirmDialog
        open={pending !== null}
        title="Delete this campaign?"
        description={
          pending
            ? `"${pending.promotion.title}" will stop showing to clients. Any discount codes attached to it keep working, and the bookings they priced are unaffected.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={pending !== null && busyId === pending.promotion.id}
        onConfirm={confirmPending}
        onCancel={cancelPending}
      />
    </>
  );
}
