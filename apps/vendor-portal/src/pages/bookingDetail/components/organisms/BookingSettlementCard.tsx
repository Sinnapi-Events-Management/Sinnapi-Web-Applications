import { useState } from 'react';
import {
  ActionNote,
  Alert,
  Button,
  SectionCard,
  SettlementPanel,
  Stack,
  StatusChip,
  Typography,
  formatAmount,
} from '@sinnapi/ui';
import PaidIcon from '@mui/icons-material/Paid';
import LockClockIcon from '@mui/icons-material/LockClock';
import { formatDateTime } from '@/lib/config';
import type { VendorBookingDetailModel } from '@/lib/types';
import { useSettlement } from '../../hooks/useSettlement';
import SettlementRequestDialog from '../molecules/SettlementRequestDialog';
import SettlementOfferDialog, { type OfferMode } from '../molecules/SettlementOfferDialog';

type Props = { booking: VendorBookingDetailModel };

/**
 * Getting paid after the event: the ask, where it has got to, and the one
 * thing the vendor can do about it right now.
 *
 * Layout only — `useSettlement` owns the gating and the writes, and
 * `SettlementPanel` owns everything the three parties must see identically.
 * What is left here is which button to offer and which dialog it opens.
 */
export default function BookingSettlementCard({ booking }: Props) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [offerMode, setOfferMode] = useState<OfferMode | null>(null);

  const settlement = useSettlement(booking);
  const { request } = settlement;

  // Nothing to show and nothing to offer: an off-platform booking, or one that
  // is nowhere near done. Drawing an empty card would only raise a question the
  // vendor cannot act on.
  if (!request && !settlement.canRequest && !settlement.requestBlockedReason) return null;

  return (
    <SectionCard
      title="Your payment"
      icon={<PaidIcon />}
      accent={settlement.mustRespond ? 'secondary' : 'info'}
      subtitle={settlement.mustRespond ? 'This is waiting on you' : undefined}
      action={request ? <StatusChip status={request.status} /> : undefined}
    >
      <Stack spacing={2}>
        {settlement.actionError && <Alert severity="error">{settlement.actionError}</Alert>}

        {request ? (
          <SettlementPanel
            request={request}
            viewer="vendor"
            events={settlement.events}
            isEventsLoading={settlement.isEventsLoading}
            eventsError={settlement.eventsError}
            formatTimestamp={formatDateTime}
            onNudge={settlement.nudge}
            isNudging={settlement.isBusy}
            actions={
              settlement.mustRespond ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={settlement.isBusy}
                    onClick={() => setOfferMode('accept')}
                  >
                    Accept {formatAmount(request.approved_amount, request.currency ?? 'UGX')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={settlement.isBusy}
                    onClick={() => setOfferMode('contest')}
                  >
                    Contest this
                  </Button>
                </Stack>
              ) : undefined
            }
          />
        ) : settlement.canRequest ? (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              The event is over and we are holding{' '}
              {formatAmount(settlement.claimableAmount, settlement.currency)} for you. Ask for it
              and we will put it to the client to approve.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<PaidIcon />}
              onClick={() => setRequestOpen(true)}
              disabled={settlement.isBusy}
              sx={{ alignSelf: 'flex-start' }}
            >
              Request my payment
            </Button>
          </Stack>
        ) : (
          <ActionNote icon={<LockClockIcon />} tone="warning">
            {settlement.requestBlockedReason}
          </ActionNote>
        )}
      </Stack>

      {requestOpen && (
        <SettlementRequestDialog
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          amount={settlement.claimableAmount}
          currency={settlement.currency}
          onSubmit={settlement.requestPayout}
          isBusy={settlement.isBusy}
          error={settlement.actionError}
        />
      )}

      {offerMode && request && (
        <SettlementOfferDialog
          mode={offerMode}
          open
          onClose={() => setOfferMode(null)}
          offered={Number(request.approved_amount ?? 0)}
          requested={Number(request.requested_amount ?? 0)}
          currency={request.currency ?? 'UGX'}
          clientReason={request.decision_reason}
          onSubmit={offerMode === 'accept' ? settlement.acceptOffer : settlement.contestOffer}
          isBusy={settlement.isBusy}
          error={settlement.actionError}
        />
      )}
    </SectionCard>
  );
}
