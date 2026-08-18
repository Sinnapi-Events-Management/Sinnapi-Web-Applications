import { useState } from 'react';
import {
  ActionNote,
  Alert,
  Button,
  SectionCard,
  SettlementPanel,
  Stack,
  StatusChip,
} from '@sinnapi/ui';
import HandshakeIcon from '@mui/icons-material/Handshake';
import LockIcon from '@mui/icons-material/Lock';
import { formatDateTime } from '@/lib/config';
import { useSettlementAdmin } from '../../hooks/useSettlementAdmin';
import SettlementForwardDialog from '../molecules/SettlementForwardDialog';
import SettlementReleaseDialog from '../molecules/SettlementReleaseDialog';

type Props = { bookingId: string };

/**
 * The post-event settlement as the console sees it: what the vendor asked for,
 * what the client answered, and the one step that is ours.
 *
 * Layout only — `useSettlementAdmin` owns the reads, the permissions and the
 * writes, and `SettlementPanel` renders the figures and the trail exactly as
 * both parties see them. That last point is the reason the console uses the
 * shared panel rather than a console-specific view of the same data: when a
 * vendor calls to argue about a number, the operator should be looking at the
 * screen the vendor is describing.
 */
export default function BookingSettlementCard({ bookingId }: Props) {
  const [forwardOpen, setForwardOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);

  const settlement = useSettlementAdmin(bookingId);
  const { request } = settlement;

  if (!request) return null;

  const isOurTurn = settlement.canForward || settlement.canRelease;

  return (
    <SectionCard
      title="Settlement"
      icon={<HandshakeIcon />}
      accent={isOurTurn ? 'secondary' : 'info'}
      subtitle={isOurTurn ? 'This is waiting on us' : undefined}
      action={<StatusChip status={request.status} />}
    >
      <Stack spacing={2}>
        {settlement.actionError && <Alert severity="error">{settlement.actionError}</Alert>}

        <SettlementPanel
          request={request}
          viewer="admin"
          events={settlement.events}
          isEventsLoading={settlement.isEventsLoading}
          eventsError={settlement.eventsError}
          formatTimestamp={formatDateTime}
          onNudge={settlement.canNudge ? settlement.nudge : undefined}
          isNudging={settlement.isBusy}
          actions={
            <Stack spacing={1}>
              {settlement.canForward && (
                <Button
                  variant="contained"
                  disabled={settlement.isBusy}
                  onClick={() => setForwardOpen(true)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Ask the client to approve
                </Button>
              )}
              {settlement.canRelease && (
                <Button
                  variant="contained"
                  color="success"
                  disabled={settlement.isBusy}
                  onClick={() => setReleaseOpen(true)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Release the agreed amount
                </Button>
              )}
              {settlement.permissionNote && (
                <ActionNote icon={<LockIcon />} tone="warning">
                  {settlement.permissionNote}
                </ActionNote>
              )}
            </Stack>
          }
        />
      </Stack>

      {forwardOpen && (
        <SettlementForwardDialog
          open={forwardOpen}
          onClose={() => setForwardOpen(false)}
          amount={Number(request.requested_amount ?? 0)}
          currency={request.currency ?? 'UGX'}
          vendorNote={request.vendor_note}
          onSubmit={settlement.forward}
          isBusy={settlement.isBusy}
          error={settlement.actionError}
        />
      )}

      {releaseOpen && (
        <SettlementReleaseDialog
          open={releaseOpen}
          onClose={() => setReleaseOpen(false)}
          request={request}
          onSubmit={settlement.release}
          isBusy={settlement.isBusy}
          error={settlement.actionError}
        />
      )}
    </SectionCard>
  );
}
