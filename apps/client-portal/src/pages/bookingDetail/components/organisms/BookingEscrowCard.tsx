import { useState } from 'react';
import {
  Alert,
  Button,
  EscrowJourney,
  MoneyBreakdown,
  PaymentDeadline,
  SectionCard,
  Stack,
  StatusChip,
  Typography,
} from '@sinnapi/ui';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShieldIcon from '@mui/icons-material/Shield';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import type { BookingDetailModel } from '@/lib/types';
import { useEscrowSection } from '../../hooks/useEscrowSection';
import { useEscrowActions } from '../../hooks/useEscrowActions';
import EscrowActivationDialog from './EscrowActivationDialog';
import RaiseIssueDialog from './RaiseIssueDialog';
import AmountHeadline from '../molecules/AmountHeadline';
import SinglePaymentNotice from '../molecules/SinglePaymentNotice';

type Props = { booking: BookingDetailModel };

/**
 * The money section of a booking: what it costs, whether Sinnapi is holding
 * it, and the one action the client can take right now.
 *
 * Layout only — `useEscrowSection` decides what state we are in and
 * `useEscrowActions` owns the writes.
 */
export default function BookingEscrowCard({ booking }: Props) {
  const [payOpen, setPayOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  const section = useEscrowSection(booking);
  const actions = useEscrowActions(booking.id, section.escrow?.id);
  const { escrow } = section;

  return (
    <SectionCard
      title="Payment"
      icon={escrow ? <ShieldIcon /> : <AccountBalanceIcon />}
      accent={escrow ? 'success' : 'secondary'}
      action={escrow ? <StatusChip status={escrow.status} /> : undefined}
    >
      <Stack spacing={2.5}>
        {!escrow && (
          <AmountHeadline
            amount={booking.amount}
            currency={booking.currency}
            paymentType={booking.payment_type}
          />
        )}

        {/* Above everything else on the card once the clock is running, and
            deliberately: how long is left is the only thing on this card that
            changes on its own, and the only thing with a consequence attached
            to ignoring it. Draws nothing on an off-platform booking, an
            unconfirmed one, or one already paid. */}
        <PaymentDeadline booking={booking} audience="client" escrowStatus={section.escrowStatus} />

        {/* The full-payment statement sits with the offer, not only in the
            dialog behind it. A client deciding whether to open the checkout at
            all is deciding whether they can afford it today. No figure here:
            the total depends on the payment rail they have not chosen yet, and
            a number that changes once they get inside is worse than none. */}
        {section.canActivate && (
          <SinglePaymentNotice grossAmount={null} currency={booking.currency} />
        )}

        {/* An off-platform booking has no escrow to show and never will. Saying
            so is better than a card that silently offers nothing: the client
            agreed to this, but they agreed to it once, weeks ago, and the page
            they come back to should still be honest about what it means. */}
        {section.isOffPlatform && !escrow && (
          <Alert severity="warning">
            You and your vendor agreed to settle this directly, outside Sinnapi. Pay them however
            the two of you arranged — we are not holding this money, cannot refund it, and cannot
            mediate if something goes wrong.
          </Alert>
        )}

        {escrow && (
          <>
            <EscrowJourney
              status={escrow.status}
              currency={escrow.currency ?? 'UGX'}
              grossAmount={escrow.gross_amount}
              advanceAmount={escrow.advance_amount}
              balanceAmount={escrow.balance_amount}
              advanceDueAt={escrow.advance_release_due_at}
              autoReleaseAt={escrow.auto_release_due_at}
            />

            <MoneyBreakdown
              dense
              currency={escrow.currency ?? 'UGX'}
              lines={[
                { label: 'Agreed with vendor', amount: escrow.agreed_amount },
                { label: 'Sinnapi service fee', amount: escrow.commission_amount, additive: true },
                { label: 'Processing fee', amount: escrow.psp_fee_amount, additive: true },
              ]}
              total={{ label: 'You paid', amount: escrow.gross_amount }}
            />
          </>
        )}

        {section.hasFailedAttempt && (
          <Alert severity="warning">
            {escrow?.failure_reason
              ? `Your last payment did not go through: ${escrow.failure_reason}`
              : 'Your last payment did not go through.'}{' '}
            No money left your account — you can try again below.
          </Alert>
        )}

        {section.isFrozen && (
          <Alert severity="info">
            Funds are frozen while our team reviews the issue raised on this booking.
          </Alert>
        )}

        {actions.error && <Alert severity="error">{actions.error}</Alert>}

        {section.canActivate && (
          <Stack spacing={1}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ShieldIcon />}
              onClick={() => setPayOpen(true)}
            >
              {section.hasFailedAttempt ? 'Try payment again' : 'Pay securely through Sinnapi'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              We hold your money and only release it to the vendor on the schedule you approve.
            </Typography>
          </Stack>
        )}

        {section.canConfirmRelease && (
          <Stack spacing={1}>
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={<TaskAltIcon />}
              onClick={actions.confirmRelease}
              disabled={actions.isBusy}
            >
              Confirm the service was delivered
            </Button>
            <Typography variant="caption" color="text.secondary">
              This releases the remaining balance to your vendor. Only confirm if you are happy with
              the work.
            </Typography>
          </Stack>
        )}

        {section.canRaiseIssue && !section.isFrozen && (
          <Button
            variant="text"
            color="error"
            size="small"
            startIcon={<ReportProblemIcon />}
            onClick={() => setIssueOpen(true)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Something went wrong
          </Button>
        )}

        {section.isSettled && (
          <Alert severity="success" icon={<TaskAltIcon />}>
            This booking is fully settled. Your vendor has been paid in full.
          </Alert>
        )}
      </Stack>

      {payOpen && (
        <EscrowActivationDialog
          open={payOpen}
          onClose={() => setPayOpen(false)}
          booking={booking}
          needsAdvanceApproval={section.needsAdvanceApproval}
          onAcceptTerms={actions.acceptAdvanceTerms}
          isAcceptingTerms={actions.isBusy}
          acceptError={actions.error}
        />
      )}

      {issueOpen && escrow && (
        <RaiseIssueDialog
          open={issueOpen}
          onClose={() => setIssueOpen(false)}
          onSubmit={actions.raiseIssue}
          isBusy={actions.isBusy}
          error={actions.error}
        />
      )}
    </SectionCard>
  );
}
