import { Button, Stack, PageTitle, QueryState } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import VendorGate from '@/vendor/VendorGate';
import { useDiscounts } from './hooks/useDiscounts';
import DiscountsTable from './components/molecules/DiscountsTable';
import DiscountDialog from './components/organisms/DiscountDialog';
import { EmptyState } from '@sinnapi/ui/router';

function DiscountsList({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error, open, openDialog, closeDialog } = useDiscounts(vendorId);

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
          New discount
        </Button>
      </Stack>
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No discounts" description="Create discount codes for your clients." />
        ) : (
          <DiscountsTable rows={rows} />
        )}
      </QueryState>

      <DiscountDialog open={open} vendorId={vendorId} onClose={closeDialog} />
    </>
  );
}

export default function Discounts() {
  return (
    <>
      <PageTitle title="Discounts" subtitle="Discount codes for your clients." />
      <VendorGate>{(vendorId) => <DiscountsList vendorId={vendorId} />}</VendorGate>
    </>
  );
}
