import { Alert, Divider, MoneyBreakdown, SectionCard, Stack, StatusChip } from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShieldIcon from '@mui/icons-material/Shield';
import type { BookingAdminModel } from '@/lib/types';
import AdvanceTermsSummary from '../molecules/AdvanceTermsSummary';

type Props = { booking: BookingAdminModel };

/**
 * The money on this booking: what escrow is holding, how it splits, and the
 * advance schedule both parties agreed to.
 *
 * The breakdown and the schedule sit in one card because an operator checking
 * either one is almost always reconciling it against the other — a vendor
 * asking where their advance is needs the rate, the due date and the escrow
 * status read together, not across two scroll positions.
 */
export default function BookingMoneyCard({ booking: b }: Props) {
  const escrow = b.escrow;
  const currency = escrow?.currency ?? b.currency ?? 'UGX';

  return (
    <SectionCard
      title="Money"
      icon={escrow ? <ShieldIcon /> : <PaymentsIcon />}
      accent={escrow ? 'success' : 'secondary'}
      action={escrow ? <StatusChip status={escrow.status} /> : undefined}
    >
      <Stack spacing={2.5}>
        {escrow ? (
          <MoneyBreakdown
            dense
            currency={currency}
            lines={[
              { label: 'Agreed with vendor', amount: escrow.agreed_amount },
              { label: 'Sinnapi commission', amount: escrow.commission_amount, additive: true },
              { label: 'Processing fee', amount: escrow.psp_fee_amount, additive: true },
            ]}
            total={{ label: 'Client paid', amount: escrow.gross_amount }}
            afterTotal={[
              {
                label: `Advance to vendor (${escrow.advance_rate ?? 0}%)`,
                amount: escrow.advance_amount,
                muted: true,
              },
              { label: 'Balance to vendor', amount: escrow.balance_amount, muted: true },
            ]}
          />
        ) : (
          <Alert severity="info" variant="outlined">
            Nothing has been funded on this booking. Escrow opens once the vendor confirms and the
            client accepts the advance schedule.
          </Alert>
        )}

        {escrow?.timers_frozen_at && (
          <Alert severity="warning">
            Release timers are frozen — a dispute or reversal is under review on this escrow.
          </Alert>
        )}

        <Divider />
        <AdvanceTermsSummary booking={b} />
      </Stack>
    </SectionCard>
  );
}
