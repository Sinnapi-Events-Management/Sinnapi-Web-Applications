import { Alert, Button, DataTable, Stack } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import AddIcon from '@mui/icons-material/Add';
import { useDiscounts } from '../../hooks/useDiscounts';
import { discountColumns } from '../../schema';
import DiscountDialog from './DiscountDialog';

/**
 * The discount codes for one vendor, with the create action above the table.
 * Mounted by <VendorGate />.
 */
export default function DiscountsList({ vendorId }: { vendorId: string }) {
  const { rows, total, isLoading, isFetching, error, table, open, openDialog, closeDialog } =
    useDiscounts(vendorId);

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
          New discount
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load discounts.'}
        </Alert>
      )}

      <DataTable
        columns={discountColumns}
        rows={rows}
        getRowId={(d) => d.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage={
          <EmptyState
            embedded
            title="No discounts"
            description="Create discount codes for your clients."
          />
        }
        {...table.controls}
      />

      <DiscountDialog open={open} vendorId={vendorId} onClose={closeDialog} />
    </>
  );
}
