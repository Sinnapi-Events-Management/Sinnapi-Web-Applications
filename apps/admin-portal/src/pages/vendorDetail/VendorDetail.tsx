import { Alert, QueryState } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useVendorDetail } from './hooks/useVendorDetail';
import VendorHero from './components/organisms/VendorHero';
import VendorTabs from './components/organisms/VendorTabs';
import VendorStats from './components/molecules/VendorStats';
import VendorStatusDialog from '../vendors/components/organisms/VendorStatusDialog';

/**
 * Everything the console knows about one vendor.
 *
 * Composition only — `useVendorDetail` owns the reads, the open section and the
 * activate/suspend flow, and each section below owns its own.
 */
export default function VendorDetail() {
  const { vendor, owner, category, kpis, isLoading, error, status, tab, setTab } =
    useVendorDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!vendor ? (
        <EmptyState title="Vendor not found" ctaLabel="Back to vendors" ctaHref="/vendors" />
      ) : (
        <>
          <VendorHero
            vendor={vendor}
            owner={owner}
            category={category}
            onRequestStatusChange={(next) => status.request(vendor, next)}
          />
          {status.err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {status.err}
            </Alert>
          )}
          <VendorStats kpis={kpis} />
          <VendorTabs
            vendor={vendor}
            owner={owner}
            category={category}
            tab={tab}
            onTabChange={setTab}
          />

          <VendorStatusDialog
            pending={status.pending}
            busy={status.busy}
            onCancel={status.cancel}
            onConfirm={status.confirm}
          />
        </>
      )}
    </QueryState>
  );
}
