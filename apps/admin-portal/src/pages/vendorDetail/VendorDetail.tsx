import { Alert } from '@sinnapi/ui';
import QueryState from '@/components/ui/QueryState';
import EmptyState from '@/components/ui/EmptyState';
import { useVendorDetail } from './hooks/useVendorDetail';
import VendorHero from './components/VendorHero';
import VendorStats from './components/VendorStats';
import VendorTabs from './components/VendorTabs';
import VendorStatusDialog from '../vendors/components/organisms/VendorStatusDialog';

export default function VendorDetail() {
  const { vendor, owner, category, kpis, isLoading, error, status } = useVendorDetail();

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
          <VendorTabs vendor={vendor} owner={owner} category={category} />

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
