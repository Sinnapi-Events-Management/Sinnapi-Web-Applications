import { useState } from 'react';
import { Box, Paper, Tabs, Tab } from '@sinnapi/ui';
import {
  useVendorBookings,
  useVendorPayments,
  useVendorQuotations,
  useVendorReviews,
} from '@/hooks/queries';
import type { NamedRef, OwnerRef, VendorDetailModel } from '@/lib/types';
import VendorRelatedTable from './VendorRelatedTable';
import OverviewTab from './OverviewTab';
import PayoutsTab from './PayoutsTab';
import { bookingColumns, paymentColumns, quotationColumns, reviewColumns } from '../schema';

type Props = {
  vendor: VendorDetailModel;
  owner: OwnerRef | null;
  category: NamedRef | null;
};

export default function VendorTabs({ vendor, owner, category }: Props) {
  const [tab, setTab] = useState(0);
  const id = vendor.id;

  const panels = [
    {
      label: 'Overview',
      render: () => <OverviewTab vendor={vendor} owner={owner} category={category} />,
    },
    {
      label: 'Bookings',
      render: () => (
        <VendorRelatedTable
          vendorId={id}
          useData={useVendorBookings}
          columns={bookingColumns}
          emptyMessage="No bookings for this vendor."
          sort={{ field: 'event_date', direction: 'desc' }}
        />
      ),
    },
    {
      label: 'Orders',
      render: () => (
        <VendorRelatedTable
          vendorId={id}
          useData={useVendorQuotations}
          columns={quotationColumns}
          emptyMessage="No orders for this vendor."
        />
      ),
    },
    {
      label: 'Payments',
      render: () => (
        <VendorRelatedTable
          vendorId={id}
          useData={useVendorPayments}
          columns={paymentColumns}
          emptyMessage="No payments for this vendor."
        />
      ),
    },
    { label: 'Payouts & Escrow', render: () => <PayoutsTab vendorId={id} /> },
    {
      label: 'Reviews',
      render: () => (
        <VendorRelatedTable
          vendorId={id}
          useData={useVendorReviews}
          columns={reviewColumns}
          emptyMessage="No reviews for this vendor yet."
        />
      ),
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          {panels.map((p) => (
            <Tab key={p.label} label={p.label} />
          ))}
        </Tabs>
      </Box>
      {panels[tab].render()}
    </Paper>
  );
}
