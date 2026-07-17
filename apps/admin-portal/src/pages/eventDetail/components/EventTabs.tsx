import { useState } from 'react';
import { Alert, Box, Paper, Tabs, Tab } from '@sinnapi/ui';
import { useEventInterests, useEventQuotations } from '@/hooks/queries';
import type { EventDetailModel, OwnerRef } from '@/lib/types';
import EventDetailsSection from './EventDetailsSection';
import EventRelatedTable from './EventRelatedTable';
import EventVendorDecisionDialog from './organisms/EventVendorDecisionDialog';
import VendorChatDrawer from './organisms/VendorChatDrawer';
import { interestColumns, quotationColumns } from '../schema';
import { useEventVendorDecision } from '../hooks/useEventVendorDecision';
import { useVendorChat } from '../hooks/useVendorChat';
import { useQuotationDownload } from '../hooks/useQuotationDownload';

type Props = {
  event: EventDetailModel;
  poster: OwnerRef | null;
};

/**
 * The event's tabbed workspace: an Overview of the event itself, then the two
 * vendor-engagement tables. Owns the approve/reject flow, the quotation PDF
 * download and the in-page chat drawer — the actions those tables trigger — so
 * their dialog and drawer live at one stable level.
 */
export default function EventTabs({ event, poster }: Props) {
  const [tab, setTab] = useState(0);
  const id = event.id;

  const decision = useEventVendorDecision(id);
  const chat = useVendorChat(id);
  const download = useQuotationDownload();

  const panels = [
    {
      label: 'Overview',
      render: () => <EventDetailsSection event={event} poster={poster} />,
    },
    {
      label: 'Interested vendors',
      render: () => (
        <EventRelatedTable
          eventId={id}
          useData={useEventInterests}
          columns={interestColumns({
            onApprove: (r) => decision.request(r, 'approve'),
            onReject: (r) => decision.request(r, 'reject'),
            onMessage: (r) => chat.open(r),
          })}
          emptyMessage="No vendors have expressed interest yet."
        />
      ),
    },
    {
      label: 'Quotations',
      render: () => (
        <EventRelatedTable
          eventId={id}
          useData={useEventQuotations}
          columns={quotationColumns({
            onApprove: (r) => decision.request(r, 'approve'),
            onReject: (r) => decision.request(r, 'reject'),
            onMessage: (r) => chat.open(r),
            onDownload: (r) => download.download(r.id),
            downloadingId: download.busyId,
          })}
          emptyMessage="No quotations have been submitted for this event yet."
        />
      ),
    },
  ];

  const actionError = decision.err ?? download.err;

  return (
    <>
      {actionError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={download.err ? download.clearError : undefined}
        >
          {actionError}
        </Alert>
      )}

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

      <EventVendorDecisionDialog
        pending={decision.pending}
        busy={decision.busy}
        onCancel={decision.cancel}
        onConfirm={decision.confirm}
      />

      <VendorChatDrawer
        open={chat.isOpen}
        target={chat.target}
        conversationId={chat.conversationId}
        loading={chat.loading}
        error={chat.error}
        eventTitle={event.title}
        onClose={chat.close}
      />
    </>
  );
}
