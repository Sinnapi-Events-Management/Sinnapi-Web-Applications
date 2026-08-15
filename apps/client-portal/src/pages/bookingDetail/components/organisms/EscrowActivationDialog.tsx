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
import { formatMoney } from '@/lib/config';
import { useEscrowActivation } from '../../hooks/useEscrowActivation';
import PaymentRailPicker from '../molecules/PaymentRailPicker';
import AdvanceTermsPanel from '../molecules/AdvanceTermsPanel';
import AdvanceRateControl from '../molecules/AdvanceRateControl';
import AdvanceConsentCheckbox from '../molecules/AdvanceConsentCheckbox';
import EscrowCostBreakdown from '../molecules/EscrowCostBreakdown';
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
  } = useEscrowActivation({ booking, open, needsAdvanceApproval, onAcceptTerms });

  const limit = quote?.advance_rate_limit ?? null;
  const isEditable = canEditAdvance && limit != null && !isPaying;

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
        <Button onClick={onClose} disabled={isPaying}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={pay}
          disabled={blocked || isQuoting || isPaying || isAcceptingTerms || !quote}
          startIcon={<OpenInNewIcon />}
        >
          {isPaying ? 'Opening…' : `Pay ${quote ? formatMoney(quote.gross_amount, currency) : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
