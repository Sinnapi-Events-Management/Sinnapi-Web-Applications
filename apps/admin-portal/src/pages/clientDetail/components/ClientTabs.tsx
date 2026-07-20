import { useState } from 'react';
import { Box, Paper, Tabs, Tab, DataTable, Alert } from '@sinnapi/ui';
import { useTableState } from '@/hooks/useTableState';
import {
  useClientBookings,
  useClientEvents,
  useClientQuotations,
  useClientVendors,
} from '@/hooks/queries';
import ClientRelatedTable from './ClientRelatedTable';
import ClientChat from './ClientChat';
import { bookingColumns, quotationColumns, eventColumns, vendorColumns } from '../schema';

type Props = { clientId: string };

/**
 * Vendors-engaged panel: a distinct-vendor list resolved in one query and
 * paginated client-side (the set is small — no server round-trips per page).
 */
function VendorsPanel({ clientId }: { clientId: string }) {
  const { data = [], isLoading, isFetching, error } = useClientVendors(clientId);
  const table = useTableState();
  const { page, pageSize } = table.params;
  const rows = data.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load vendors.'}
        </Alert>
      )}
      <DataTable
        columns={vendorColumns}
        rows={rows}
        getRowId={(v) => v.id}
        rowCount={data.length}
        loading={isLoading || isFetching}
        emptyMessage="This client hasn't engaged any vendors yet."
        {...table.controls}
      />
    </>
  );
}

export default function ClientTabs({ clientId }: Props) {
  const [tab, setTab] = useState(0);

  const panels = [
    {
      label: 'Bookings',
      render: () => (
        <ClientRelatedTable
          clientId={clientId}
          useData={useClientBookings}
          columns={bookingColumns}
          emptyMessage="No bookings for this client."
          sort={{ field: 'event_date', direction: 'desc' }}
        />
      ),
    },
    {
      label: 'Events',
      render: () => (
        <ClientRelatedTable
          clientId={clientId}
          useData={useClientEvents}
          columns={eventColumns}
          emptyMessage="This client hasn't posted any events."
        />
      ),
    },
    {
      label: 'Quotations',
      render: () => (
        <ClientRelatedTable
          clientId={clientId}
          useData={useClientQuotations}
          columns={quotationColumns}
          emptyMessage="No quotations for this client."
        />
      ),
    },
    { label: 'Vendors', render: () => <VendorsPanel clientId={clientId} /> },
    { label: 'Chat', render: () => <ClientChat clientId={clientId} /> },
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
