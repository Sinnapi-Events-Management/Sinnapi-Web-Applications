import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@sinnapi/ui';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CheckoutRailPicker, FxConfirmationDialog } from '@sinnapi/ui/payments';
import { formatMoney } from '@/lib/config';
import { useEscrowActivation } from '../../hooks/useEscrowActivation';
import AdvanceTermsPanel from '../molecules/AdvanceTermsPanel';
import AdvanceRateControl from '@/components/paymentTerms/components/molecules/AdvanceRateControl';
import AdvanceConsentCheckbox from '@/components/paymentTerms/components/molecules/AdvanceConsentCheckbox';
import EscrowCostBreakdown from '../molecules/EscrowCostBreakdown';
import SinglePaymentNotice from '../molecules/SinglePaymentNotice';
import type { BookingDetailModel } from '@/lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  booking: BookingDetailModel;
  /** True until the client has consented to an advance schedule. */
  needsAdvanceApproval: boolean;
  onAcceptTerms: (advanceRate: number | null) => Promise<boolean>;
  isAcceptingTerms: boolean;
  acceptError: string | null;
};

/**
 * The escrow checkout: choose the advance, pick a rail, see the real total,
 * then hand off to the provider.
 *
 * Layout only — `useEscrowActivation` owns the pricing, the chosen rate and
 * the rule about when the client may proceed. Three explicit steps in one
 * dialog, because the client is agreeing to three separate things: how much
 * money may reach the vendor before the event, how they are paying, and that
 * the total is more than the price they negotiated. None of them should be
 * something they discover afterwards.
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
  const {
    quote,
    rail,
    rails,
    railIndex,
    setRailIndex,
    isQuoting,
    isRepricing,
    pay,
    isPaying,
    payError,
    advance,
    canEditAdvance,
    agreed,
    setAgreed,
    blocked,
    currency,
    fx,
  } = useEscrowActivation({ booking, open, needsAdvanceApproval, onAcceptTerms });

  const limit = quote?.advance_rate_limit ?? null;
  const isEditable = canEditAdvance && limit != null && !isPaying;

  return (
    // `onClose`/Cancel stay reachable while `isPaying`. The checkout call
    // carries its own client-side timeout, but a payer should never be
    // trapped in a modal with no way out for however long that takes —
    // dismissing here is safe; the request is left to resolve in the
    // background and the server's in-flight guard + idempotency key both
    // already assume a checkout attempt can be walked away from.
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
              isRepricing={isRepricing}
              control={
                isEditable ? (
                  <AdvanceRateControl
                    control={advance.form.control}
                    limit={limit}
                    value={advance.sliderValue}
                    onChange={advance.setRate}
                    disabled={isPaying}
                  />
                ) : undefined
              }
            />
          )}

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              How would you like to pay?
            </Typography>
            <CheckoutRailPicker
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
            {/* Immediately above the breakdown, which is the one place a client
                can misread the advance/balance split as a payment plan. Here
                the total is known, so it is named. */}
            <Box sx={{ mb: 1.5 }}>
              <SinglePaymentNotice grossAmount={quote?.gross_amount ?? null} currency={currency} />
            </Box>
            <EscrowCostBreakdown
              quote={quote}
              currency={currency}
              railLabel={rail.label}
              isLoading={isQuoting}
              isRepricing={isRepricing}
            />
          </Box>

          {needsAdvanceApproval && (
            <AdvanceConsentCheckbox
              checked={agreed}
              onChange={setAgreed}
              disabled={isPaying}
              advanceAmount={quote?.advance_amount ?? null}
              currency={currency}
            />
          )}

          {acceptError && <Alert severity="error">{acceptError}</Alert>}
          {payError && <Alert severity="error">{payError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={pay}
          disabled={blocked || isQuoting || isPaying || isAcceptingTerms || !quote}
          startIcon={<OpenInNewIcon />}
        >
          {isPaying
            ? 'Opening…'
            : rail.provider === 'paypal'
              ? 'Continue'
              : `Pay ${quote ? formatMoney(quote.gross_amount, currency) : ''}`}
        </Button>
      </DialogActions>

      {/* PayPal only. The client has agreed to a shilling total; this is
          where they see, and accept, what that becomes in the currency
          PayPal can actually charge. Nothing is created at the provider
          until they do. */}
      <FxConfirmationDialog
        open={fx.open}
        quote={fx.quote}
        providerLabel={rail.label}
        isLoading={fx.isLoading}
        isConfirming={fx.isConfirming}
        error={fx.error}
        onConfirm={fx.confirm}
        onCancel={fx.cancel}
        onRequote={fx.requote}
        formatMoney={formatMoney}
      />
    </Dialog>
  );
}
