import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Button,
  Divider,
  InfoRow,
  MoneyBreakdown,
  SectionCard,
  Stack,
  StatusChip,
} from '@sinnapi/ui';
import ShieldIcon from '@mui/icons-material/Shield';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatDateTime } from '@/lib/config';
import type { PaymentAdminDetailModel } from '@/lib/types';

type Props = { payment: PaymentAdminDetailModel };

/**
 * The escrow this payment was opened for: where it stands and how the money
 * splits. The breakdown is the booking page's exact split, so the two can
 * never disagree about what the client paid for.
 *
 * The one fact this card adds that the booking page does not is whether this
 * payment is still the escrow's funding payment. It stops being so when a
 * checkout is superseded (0903i) — and money that then arrives on it has
 * funded nothing, which is the finding an investigator is here to make.
 */
export default function PaymentEscrowCard({ payment: p }: Props) {
  const e = p.escrow;

  if (!e) {
    return (
      <SectionCard title="Escrow" icon={<ShieldIcon />} accent="secondary">
        <Alert severity="info" variant="outlined">
          {p.purpose === 'subscription'
            ? 'A subscription payment funds no escrow — it goes to Sinnapi directly.'
            : p.purpose === 'booking_direct'
              ? 'A direct booking payment is settled between the parties; Sinnapi holds nothing.'
              : 'No escrow is attached to this payment.'}
        </Alert>
      </SectionCard>
    );
  }

  const superseded = e.funding_payment_id !== p.id;
  const currency = e.currency ?? p.currency ?? 'UGX';

  return (
    <SectionCard
      title="Escrow"
      icon={<ShieldIcon />}
      accent={superseded ? 'warning' : 'success'}
      action={<StatusChip status={e.status} />}
    >
      <Stack spacing={2.5}>
        {superseded && (
          <Alert severity="warning">
            This escrow is no longer funded by this payment
            {e.attempt_no != null ? ` (now on attempt ${e.attempt_no})` : ''}. This checkout was
            superseded; any money the provider reports on it has funded nothing and should appear
            under Exceptions.
          </Alert>
        )}
        {e.failure_reason && (
          <Alert severity="error" variant="outlined">
            Escrow failure reason: {e.failure_reason}
          </Alert>
        )}
        {e.timers_frozen_at && (
          <Alert severity="warning">
            Release timers are frozen since {formatDateTime(e.timers_frozen_at)} — a dispute or
            reversal is under review on this escrow.
          </Alert>
        )}

        <MoneyBreakdown
          dense
          currency={currency}
          lines={[
            { label: 'Agreed with vendor', amount: e.agreed_amount },
            { label: 'Sinnapi commission', amount: e.commission_amount, additive: true },
            { label: 'Processing fee', amount: e.psp_fee_amount, additive: true },
          ]}
          total={{ label: 'Client paid', amount: e.gross_amount }}
          afterTotal={[
            {
              label: `Advance to vendor (${e.advance_rate ?? 0}%)`,
              amount: e.advance_amount,
              muted: true,
            },
            { label: 'Balance to vendor', amount: e.balance_amount, muted: true },
          ]}
        />

        <Divider />

        <div>
          <InfoRow label="Escrow ID" value={e.id} mono copyValue={e.id} />
          <InfoRow
            label="Advance due"
            value={e.advance_release_due_at ? formatDateTime(e.advance_release_due_at) : '—'}
          />
          <InfoRow
            label="Advance released"
            value={e.advance_released_at ? formatDateTime(e.advance_released_at) : 'Not yet'}
          />
          <InfoRow
            label="Balance released"
            value={e.balance_released_at ? formatDateTime(e.balance_released_at) : 'Not yet'}
          />
        </div>

        <Button
          component={RouterLink}
          to={`/bookings/${e.booking_id}?tab=money`}
          variant="outlined"
          size="small"
          endIcon={<OpenInNewIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Open booking
        </Button>
      </Stack>
    </SectionCard>
  );
}
