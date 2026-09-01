import { Box, Paper, Tabs, Tab } from '@sinnapi/ui';
import {
  useVendorBookings,
  useVendorPayments,
  useVendorQuotations,
  useVendorReviews,
} from '@/hooks/queries';
import type { NamedRef, OwnerRef, VendorDetailModel } from '@/lib/types';
import VendorRelatedTable from '../molecules/VendorRelatedTable';
import OverviewTab from './OverviewTab';
import PayoutsTab from './PayoutsTab';
import PackagesTab from './PackagesTab';
import OffersTab from './OffersTab';
import {
  bookingColumns,
  paymentColumns,
  quotationColumns,
  reviewColumns,
  VENDOR_TABS,
  VENDOR_TAB_LABELS,
  type VendorTab,
} from '../../schema';

type Props = {
  vendor: VendorDetailModel;
  owner: OwnerRef | null;
  category: NamedRef | null;
  tab: VendorTab;
  onTabChange: (next: VendorTab) => void;
};

/**
 * The dossier's sections, one mounted at a time.
 *
 * Only the open section renders, so each tab's queries fire when it is first
 * opened rather than on load — eight tabs eagerly fetching would make opening a
 * vendor eight round trips to answer one question.
 *
 * The selected tab is the caller's, held in the URL, so an operator can send
 * "their offers are the problem" as a link that opens on the offers.
 *
 * Structure only: every section owns its own reads and writes.
 */
export default function VendorTabs({ vendor, owner, category, tab, onTabChange }: Props) {
  const id = vendor.id;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, next: VendorTab) => onTabChange(next)}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Vendor sections"
        >
          {VENDOR_TABS.map((value) => (
            <Tab key={value} value={value} label={VENDOR_TAB_LABELS[value]} />
          ))}
        </Tabs>
      </Box>

      {tab === 'overview' && <OverviewTab vendor={vendor} owner={owner} category={category} />}

      {tab === 'bookings' && (
        <VendorRelatedTable
          vendorId={id}
          useData={useVendorBookings}
          columns={bookingColumns}
          emptyMessage="No bookings for this vendor."
          sort={{ field: 'event_date', direction: 'desc' }}
        />
      )}

      {tab === 'orders' && (
        <VendorRelatedTable
          vendorId={id}
          useData={useVendorQuotations}
          columns={quotationColumns}
          emptyMessage="No orders for this vendor."
        />
      )}

      {tab === 'payments' && (
        <VendorRelatedTable
          vendorId={id}
          useData={useVendorPayments}
          columns={paymentColumns}
          emptyMessage="No payments for this vendor."
        />
      )}

      {tab === 'packages' && <PackagesTab vendorId={id} />}

      {tab === 'offers' && <OffersTab vendorId={id} />}

      {tab === 'payouts' && <PayoutsTab vendorId={id} />}

      {tab === 'reviews' && (
        <VendorRelatedTable
          vendorId={id}
          useData={useVendorReviews}
          columns={reviewColumns}
          emptyMessage="No reviews for this vendor yet."
        />
      )}
    </Paper>
  );
}
