import { Alert, ConfirmDialog, PageTitle, QueryState } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import { usePackages } from './hooks/usePackages';
import { usePackageActions } from './hooks/usePackageActions';
import PackageToolbar from './components/organisms/PackageToolbar';
import PackageGrid from './components/organisms/PackageGrid';
import PackageEditorDialog from './components/organisms/PackageEditorDialog';

/**
 * The vendor's package catalogue.
 *
 * Two hooks rather than one: `usePackages` owns what is on screen, and
 * `usePackageActions` owns what happens to a package. They are separate because
 * an action's in-flight state belongs to one card while the list's filter
 * belongs to the whole page, and one hook holding both would re-render every
 * card whenever any of them was published.
 */
function PackagesCatalogue({ vendorId }: { vendorId: string }) {
  const list = usePackages(vendorId);
  const actions = usePackageActions(vendorId);

  return (
    <>
      <PackageToolbar
        filter={list.filter}
        counts={list.counts}
        onFilter={list.setFilter}
        onCreate={list.create}
      />

      {actions.error && (
        <Alert severity="error" onClose={actions.dismissError} sx={{ mb: 2 }}>
          {actions.error}
        </Alert>
      )}

      <QueryState isLoading={list.isLoading} error={list.error}>
        <PackageGrid
          packages={list.visible}
          busyId={actions.busyId}
          isFiltered={!list.isEmpty}
          onEdit={list.edit}
          onDuplicate={actions.duplicate}
          onDelete={actions.requestDelete}
          onSetVisibility={actions.setVisibility}
        />
      </QueryState>

      <PackageEditorDialog
        open={list.isEditorOpen}
        vendorId={vendorId}
        pkg={list.editing}
        onClose={list.closeEditor}
      />

      <ConfirmDialog
        open={actions.pending?.kind === 'delete'}
        title={`Delete ${actions.pending?.pkg.name ?? 'this package'}?`}
        description="It leaves your profile and you can no longer quote from it. Quotes already built from it keep their own line items and are unaffected."
        confirmLabel="Delete package"
        destructive
        loading={actions.busyId != null}
        onConfirm={actions.confirmPending}
        onCancel={actions.cancelPending}
      />
    </>
  );
}

export default function Packages() {
  return (
    <>
      <PageTitle
        title="Packages"
        subtitle="Priced offers you can publish to your profile and quote from in one click."
      />
      <VendorGate>{(vendorId) => <PackagesCatalogue vendorId={vendorId} />}</VendorGate>
    </>
  );
}
