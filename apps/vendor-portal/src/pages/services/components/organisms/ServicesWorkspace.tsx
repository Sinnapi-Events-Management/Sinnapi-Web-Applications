import { Alert, QueryState } from '@sinnapi/ui';
import { useServices } from '../../hooks/useServices';
import { useServiceActions } from '../../hooks/useServiceActions';
import ServicesToolbar from './ServicesToolbar';
import ServiceGrid from './ServiceGrid';
import ServiceDialog from './ServiceDialog';
import ServiceArchiveDialog from './ServiceArchiveDialog';

/**
 * The services screen for one vendor: toolbar, catalogue, editor, and the one
 * step that asks before it acts.
 *
 * Two hooks rather than one. `useServices` owns what is on screen — the two
 * reads it joins, the filter, and which service the editor is open on — and
 * `useServiceActions` owns what happens to a service. They are separate
 * because an action's in-flight state belongs to one card while the filter
 * belongs to the whole page, and one hook holding both would re-render every
 * card whenever any one of them was hidden.
 *
 * That leaves this component as the arrangement and nothing else, which is
 * what lets the layout change without anyone re-reading how a service's price
 * is derived or what archiving one does to its packages.
 *
 * `QueryState` guards the catalogue only. The packages read that produces each
 * card's "from" figure is allowed to be slower or to fail outright: the
 * catalogue is the point of the screen, and a card showing a skeleton where
 * its price goes is far better than a page showing nothing because a secondary
 * query is still in flight. The one thing that read does gate is archiving,
 * which `ServiceArchiveDialog` handles by refusing to act until it knows.
 */
export default function ServicesWorkspace({ vendorId }: { vendorId: string }) {
  const list = useServices(vendorId);
  const actions = useServiceActions(vendorId);

  return (
    <>
      <ServicesToolbar
        filter={list.filter}
        counts={list.counts}
        onFilter={list.setFilter}
        onAdd={list.create}
      />

      {actions.error && (
        <Alert severity="error" onClose={actions.dismissError} sx={{ mb: 2 }}>
          {actions.error}
        </Alert>
      )}

      <QueryState isLoading={list.isLoading} error={list.error}>
        <ServiceGrid
          rows={list.visible}
          filter={list.filter}
          counts={list.counts}
          isEmpty={list.isEmpty}
          pricingLoading={list.pricingLoading}
          busyId={actions.busyId}
          onAdd={list.create}
          onEdit={list.edit}
          onToggleVisibility={(service) => actions.setVisibility(service, service.state !== 'live')}
          onArchive={actions.requestArchive}
          onRestore={actions.restore}
        />
      </QueryState>

      <ServiceDialog
        open={list.isEditorOpen}
        vendorId={vendorId}
        service={list.editing}
        onClose={list.closeEditor}
      />

      <ServiceArchiveDialog
        service={actions.pending?.service ?? null}
        pricingLoading={list.pricingLoading}
        busy={actions.busyId != null}
        onConfirm={actions.confirmPending}
        onCancel={actions.cancelPending}
      />
    </>
  );
}
