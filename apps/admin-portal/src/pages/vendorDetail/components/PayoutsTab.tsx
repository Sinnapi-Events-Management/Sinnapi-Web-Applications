import { Stack, Typography } from '@sinnapi/ui';
import { useVendorEscrow, useVendorPayouts } from '@/hooks/queries';
import VendorRelatedTable from './VendorRelatedTable';
import { escrowColumns, payoutColumns } from '../schema';

/** Combined finance view: escrow holds and their resulting payouts. */
export default function PayoutsTab({ vendorId }: { vendorId: string }) {
  return (
    <Stack spacing={4}>
      <div>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Escrow
        </Typography>
        <VendorRelatedTable
          vendorId={vendorId}
          useData={useVendorEscrow}
          columns={escrowColumns}
          emptyMessage="No escrow transactions for this vendor."
        />
      </div>
      <div>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Payouts
        </Typography>
        <VendorRelatedTable
          vendorId={vendorId}
          useData={useVendorPayouts}
          columns={payoutColumns}
          emptyMessage="No payouts for this vendor."
        />
      </div>
    </Stack>
  );
}
