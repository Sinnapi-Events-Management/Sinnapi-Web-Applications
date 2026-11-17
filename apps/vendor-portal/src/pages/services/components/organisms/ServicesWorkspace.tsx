import { useState } from 'react';
import { Alert, Card, CardContent, ConfirmDialog, QueryState, Typography } from '@sinnapi/ui';
import { usePackages } from '@/pages/packages/hooks/usePackages';
import { usePackageActions } from '@/pages/packages/hooks/usePackageActions';
import PackageEditorDialog from '@/pages/packages/components/organisms/PackageEditorDialog';
import type { PackageModel } from '@/lib/types';
import ServicePackages, { type PackageHandlers } from '../molecules/ServicePackages';
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

  // Prices (packages) live inside their service's card now — Services and
  // Packages became one page on 2026-11-17.
  const pkgs = usePackages(vendorId);
  const pkgActions = usePackageActions(vendorId);
  const [editor, setEditor] = useState<{
    pkg: PackageModel | null;
    serviceId: string | null;
  } | null>(null);
  const live = (pkgs.rows ?? []).filter((p) => p.is_active !== false);
  const handlers = (serviceId: string | null): PackageHandlers => ({
    onAdd: () => setEditor({ pkg: null, serviceId }),
    onEdit: (pkg) => setEditor({ pkg, serviceId: pkg.vendor_service_id ?? null }),
    onSetVisibility: (pkg, show) => void pkgActions.setVisibility(pkg, show),
    onDuplicate: (pkg) => void pkgActions.duplicate(pkg),
    onDelete: pkgActions.requestDelete,
    busyId: pkgActions.busyId,
  });
  const serviceIds = new Set(list.visible.map((s) => s.id));
  const loose = live.filter((p) => !p.vendor_service_id || !serviceIds.has(p.vendor_service_id));

  return (
    <>
      <ServicesToolbar
        filter={list.filter}
        counts={list.counts}
        onFilter={list.setFilter}
        onAdd={list.create}
      />

      {pkgActions.error && (
        <Alert severity="error" onClose={pkgActions.dismissError} sx={{ mb: 2 }}>
          {pkgActions.error}
        </Alert>
      )}
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
          renderPrices={(service) => (
            <ServicePackages
              packages={live.filter((p) => p.vendor_service_id === service.id)}
              h={handlers(service.id)}
            />
          )}
        />
        {list.filter === 'all' && loose.length > 0 && (
          <Card variant="outlined" sx={{ mt: 2, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6">Other prices</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Not linked to a service. Open one and choose its service to tidy this up.
              </Typography>
              <ServicePackages packages={loose} h={handlers(null)} />
            </CardContent>
          </Card>
        )}
      </QueryState>

      <PackageEditorDialog
        open={editor !== null}
        vendorId={vendorId}
        pkg={editor?.pkg ?? null}
        defaultServiceId={editor?.serviceId}
        onClose={() => setEditor(null)}
      />
      <ConfirmDialog
        open={pkgActions.pending?.kind === 'delete'}
        title={`Delete ${pkgActions.pending?.pkg.name ?? 'this price'}?`}
        description="It leaves your page and you can no longer quote from it. Quotes already sent are not changed."
        confirmLabel="Delete"
        destructive
        loading={pkgActions.busyId != null}
        onConfirm={pkgActions.confirmPending}
        onCancel={pkgActions.cancelPending}
      />

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
