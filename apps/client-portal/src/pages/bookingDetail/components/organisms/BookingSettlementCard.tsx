import { useState } from 'react';
import { Alert, Button, SectionCard, SettlementPanel, Stack, StatusChip } from '@sinnapi/ui';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { formatDateTime } from '@/lib/config';
import type { BookingDetailModel } from '@/lib/types';
import { useSettlementDecision } from '../../hooks/useSettlementDecision';
import SettlementDecisionDialog from './SettlementDecisionDialog';

type Props = { booking: BookingDetailModel };

/**
 * The vendor's request to be paid, and the client's answer to it.
 *
 * Sits apart from the escrow card on purpose. That card is about money the
 * client has already committed — what it cost, what is protected, what has
 * moved. This one is a question addressed to them personally, with someone
 * waiting on the answer, and burying a decision inside a status card is how it
 * gets read as information and left alone.
 *
 * Layout only: `useSettlementDecision` owns the reads and the writes, and
 * `SettlementPanel` renders everything all three parties must see identically.
 */
export default function BookingSettlementCard({ booking }: Props) {
  const [decisionOpen, setDecisionOpen] = useState(false);

  const settlement = useSettlementDecision(booking);
  const { request } = settlement;

  // Nothing has been asked for yet. The escrow card already explains where the
  // money is; a second card saying nothing would only add noise.
  if (!request) return null;

  return (
    <SectionCard
      title="Paying your vendor"
      icon={<HandshakeIcon />}
      accent={settlement.mustDecide ? 'secondary' : 'info'}
      subtitle={settlement.mustDecide ? 'This is waiting on you' : undefined}
      action={<StatusChip status={request.status} />}
    >
      <Stack spacing={2}>
        {settlement.actionError && <Alert severity="error">{settlement.actionError}</Alert>}

        <SettlementPanel
          request={request}
          viewer="client"
          events={settlement.events}
          isEventsLoading={settlement.isEventsLoading}
          eventsError={settlement.eventsError}
          formatTimestamp={formatDateTime}
          onNudge={settlement.nudge}
          isNudging={settlement.isBusy}
          actions={
            settlement.mustDecide ? (
              <Button
                variant="contained"
                size="large"
                color="success"
                disabled={settlement.isBusy}
                onClick={() => setDecisionOpen(true)}
                sx={{ alignSelf: 'flex-start' }}
              >
                Decide what to pay
              </Button>
            ) : undefined
          }
        />
      </Stack>

      {decisionOpen && (
        <SettlementDecisionDialog
          open={decisionOpen}
          onClose={() => setDecisionOpen(false)}
          request={request}
          onApproveFull={settlement.approveFull}
          onApproveReduced={settlement.approveReduced}
          isBusy={settlement.isBusy}
          error={settlement.actionError}
        />
      )}
    </SectionCard>
  );
}
