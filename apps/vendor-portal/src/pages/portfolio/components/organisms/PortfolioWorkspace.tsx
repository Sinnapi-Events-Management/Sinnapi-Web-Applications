import { Alert, ConfirmDialog, QueryState, Stack } from '@sinnapi/ui';
import { MediaViewer } from '@sinnapi/ui/media';
import { EmptyState } from '@sinnapi/ui/router';
import { useVendorContext } from '@/vendor/VendorProvider';
import { usePortfolio } from '../../hooks/usePortfolio';
import PortfolioToolbar from './PortfolioToolbar';
import PortfolioGrid from './PortfolioGrid';
import MediaDialog from './MediaDialog';
import PortfolioViewerActions from '../molecules/PortfolioViewerActions';

/**
 * The portfolio screen for one vendor: the toolbar, the grid, the viewer, and the
 * two dialogs.
 *
 * Every piece of state is in `usePortfolio`, so this component is the arrangement
 * and nothing else — which is what lets the layout change without anyone
 * re-reading how a drag is persisted or how a plan cap is derived.
 *
 * `QueryState` guards the grid alone. The plans read behind the allowance meter
 * is allowed to be slower or to fail outright: the portfolio is the point of the
 * screen, and a toolbar briefly missing its meter beats a page showing nothing
 * because a secondary query is still in flight.
 */
export default function PortfolioWorkspace({ vendorId }: { vendorId: string }) {
  const { vendor } = useVendorContext();
  const vendorName = vendor?.business_name ?? 'Your portfolio';
  const {
    isLoading,
    error,
    isEmpty,
    visible,
    counts,
    filter,
    filterOptions,
    setFilter,
    canReorder,
    reorder,
    actions,
    viewer,
    plan,
    dialog,
  } = usePortfolio(vendorId);

  return (
    <>
      <PortfolioToolbar
        counts={counts}
        filter={filter}
        filterOptions={filterOptions}
        plan={plan}
        canReorder={canReorder}
        onFilter={setFilter}
        onAdd={dialog.openDialog}
      />

      {/* Failures from an action the vendor took, not from the page load — shown
          above the grid so the grid itself keeps rendering underneath. */}
      <Stack spacing={1} sx={{ mb: 2 }}>
        {actions.error && (
          <Alert severity="error" onClose={actions.dismissError}>
            {actions.error}
          </Alert>
        )}
        {reorder.error && (
          <Alert severity="error" onClose={reorder.dismissError}>
            {reorder.error}
          </Alert>
        )}
      </Stack>

      <QueryState isLoading={isLoading} error={error}>
        {isEmpty ? (
          <EmptyState
            title="Show clients what you do"
            description="Photos and video from past events are the first thing a client looks at. Add a few of your best."
            ctaLabel="Add your first photos"
            onCta={dialog.openDialog}
          />
        ) : (
          <PortfolioGrid
            items={visible}
            vendorName={vendorName}
            canReorder={canReorder}
            dragIndex={reorder.dragIndex}
            busyId={actions.busyId}
            onOpen={viewer.openAt}
            onMove={reorder.move}
            onSetCover={actions.setCover}
            onRemove={actions.requestRemoval}
            onDragStart={reorder.onDragStart}
            onDragOver={reorder.onDragOver}
            onDragEnd={reorder.onDragEnd}
          />
        )}
      </QueryState>

      <MediaViewer
        items={visible}
        item={viewer.active}
        index={viewer.index}
        position={viewer.position}
        count={viewer.count}
        canStep={viewer.canStep}
        fallbackAlt={vendorName}
        actions={
          viewer.active && (
            <PortfolioViewerActions
              item={viewer.active}
              busy={actions.busyId === viewer.active.id}
              onSetCover={actions.setCover}
              onRemove={actions.requestRemoval}
            />
          )
        }
        onClose={viewer.close}
        onNext={viewer.next}
        onPrevious={viewer.previous}
        onSelect={viewer.goTo}
        onKeyDown={viewer.onKeyDown}
      />

      <ConfirmDialog
        open={actions.pending !== null}
        title="Remove this from your portfolio?"
        description="It disappears from your public profile straight away. Removing it does not affect any booking, quote or review that mentions your work."
        confirmLabel="Remove"
        destructive
        loading={actions.busyId !== null}
        onConfirm={actions.confirmRemoval}
        onCancel={actions.cancelRemoval}
      />

      <MediaDialog
        open={dialog.open}
        vendorId={vendorId}
        plan={plan}
        nextSortOrder={dialog.nextSortOrder}
        needsCover={dialog.needsCover}
        onClose={dialog.closeDialog}
      />
    </>
  );
}
