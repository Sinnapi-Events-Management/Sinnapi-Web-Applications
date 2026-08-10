import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MoneyBreakdown,
  Skeleton,
  Stack,
  Typography,
} from '@sinnapi/ui';
import LockIcon from '@mui/icons-material/Lock';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useEscrowCheckout } from '../../hooks/useEscrowCheckout';
import PaymentRailPicker from '../molecules/PaymentRailPicker';
import AdvanceTermsPanel from '../molecules/AdvanceTermsPanel';
import type { BookingDetailModel } from '@/lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  booking: BookingDetailModel;
  /** True until the client has consented to the advance schedule. */
  needsAdvanceApproval: boolean;
  onAcceptTerms: () => Promise<void>;
  isAcceptingTerms: boolean;
  acceptError: string | null;
};

/**
 * The escrow checkout: agree the schedule, pick a rail, see the real total,
 * then hand off to the provider.
 *
 * Consent and payment are one dialog but two explicit steps. The client is
 * agreeing to two separate things — that money may reach the vendor before the
 * event, and that they will pay more than the price they negotiated — and
 * neither should be something they discover after the fact.
 */
export default function EscrowActivationDialog({
  open,
  onClose,
  booking,
  needsAdvanceApproval,
  onAcceptTerms,
  isAcceptingTerms,
  acceptError,
}: Props) {
  const [agreed, setAgreed] = useState(false);
  const checkout = useEscrowCheckout(booking.id, open);
  const { quote, rail, rails, railIndex, setRailIndex, isQuoting, pay, isPaying, payError } =
    checkout;

  const currency = quote?.currency ?? booking.currency;
  const blocked = needsAdvanceApproval && !agreed;

  async function handlePay() {
    // Record consent first: the charge itself refuses without it, so doing it
    // in this order means a client can never reach the PSP and bounce back.
    if (needsAdvanceApproval) await onAcceptTerms();
    await pay();
  }

  return (
    <Dialog open={open} onClose={isPaying ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pay through Sinnapi escrow</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {quote && (
            <AdvanceTermsPanel
              advanceRate={quote.advance_rate}
              advanceAmount={quote.advance_amount}
              balanceAmount={quote.balance_amount}
              daysBefore={quote.advance_release_days_before}
              releaseDueAt={quote.advance_release_due_at}
              currency={currency}
              note={booking.advance_terms_note}
            />
          )}

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              How would you like to pay?
            </Typography>
            <PaymentRailPicker
              rails={rails}
              selected={railIndex}
              onSelect={setRailIndex}
              disabled={isPaying}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
              What you pay
            </Typography>
            {isQuoting || !quote ? (
              <Stack spacing={1}>
                <Skeleton height={22} />
                <Skeleton height={22} />
                <Skeleton height={22} />
                <Skeleton height={32} />
              </Stack>
            ) : (
              <MoneyBreakdown
                currency={currency ?? 'UGX'}
                lines={[
                  {
                    label: 'Agreed with your vendor',
                    amount: quote.agreed_amount,
                    hint: 'The full amount your vendor receives. Sinnapi does not take a cut of this.',
                  },
                  {
                    label: `Sinnapi service fee (${Number(quote.commission_rate)}%)`,
                    amount: quote.commission_amount,
                    additive: true,
                    hint: 'What it costs to hold your money securely, mediate any issues, and guarantee the vendor is paid.',
                  },
                  {
                    label: `Processing fee (${Number(quote.psp_fee_rate)}%)`,
                    amount: quote.psp_fee_amount,
                    additive: true,
                    hint: `Charged by ${rail.label} to process the payment. This varies by payment method.`,
                  },
                ]}
                total={{ label: 'Total to pay', amount: quote.gross_amount }}
                footnote={
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <LockIcon sx={{ fontSize: 14 }} />
                    <span>
                      Your card or wallet details are entered on {rail.label}&rsquo;s own secure
                      page and never reach Sinnapi.
                    </span>
                  </Stack>
                }
              />
            )}
          </Box>

          {needsAdvanceApproval && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  disabled={isPaying}
                />
              }
              label={
                <Typography variant="body2">
                  I agree to this payment schedule, including the advance being released to my
                  vendor before the event.
                </Typography>
              }
              sx={{ alignItems: 'flex-start', m: 0, '& .MuiCheckbox-root': { pt: 0 } }}
            />
          )}

          {acceptError && <Alert severity="error">{acceptError}</Alert>}
          {payError && <Alert severity="error">{payError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isPaying}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handlePay}
          disabled={blocked || isQuoting || isPaying || isAcceptingTerms || !quote}
          startIcon={<OpenInNewIcon />}
        >
          {isPaying ? 'Opening…' : `Pay ${quote ? formatTotal(quote.gross_amount, currency) : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function formatTotal(amount: number | null, currency: string | null): string {
  if (amount == null) return '';
  return `${currency ?? 'UGX'} ${new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(amount)}`;
}
