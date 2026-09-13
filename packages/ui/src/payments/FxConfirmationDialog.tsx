'use client';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ProviderLogo } from './atoms/ProviderLogo';
import { CheckoutActions } from './molecules/CheckoutActions';
import { FxAmountHero } from './molecules/FxAmountHero';
import { FxRateLines } from './molecules/FxRateLines';
import { FxLockNotice } from './molecules/FxLockNotice';
import { useFxCountdown } from './hooks/useFxCountdown';
import { useCheckoutDialogLayout } from './hooks/useCheckoutDialogLayout';

/** The conversion a payer is being asked to accept, as the server priced it. */
export type FxQuoteView = {
  fxQuoteId: string;
  /** What is owed, in the currency the obligation is denominated in. */
  baseAmount: number;
  baseCurrency: string;
  /** What the payer will actually be charged. */
  amount: number;
  currency: string;
  /** Mid-market, as base units per one unit of the charge currency. */
  midRate: number;
  /** What this charge works out at, margin included. */
  effectiveRate: number;
  marginRate: number;
  /** The margin, in the base currency, so it reads next to a familiar figure. */
  marginAmount: number;
  rateFetchedAt: string;
  /** True when the FX API was unreachable and a stored rate was used. */
  rateStale: boolean;
  expiresAt: string;
};

export type FxConfirmationDialogProps = {
  open: boolean;
  quote: FxQuoteView | null;
  /** The rail's name, for the explanation and the title. */
  providerLabel: string;
  isLoading: boolean;
  isConfirming: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  /** Each portal keeps its own locale rules; the kit stays formatting-free. */
  formatMoney: (amount: number, currency: string) => string;
  /** Re-price after the lock lapses. */
  onRequote: () => void;
};

/**
 * The currency-conversion step, shown before the payer leaves for PayPal.
 *
 * PayPal cannot accept shillings, so a payer who agreed to a figure in UGX is
 * about to be charged a different-looking number in USD. That is the most
 * surprising fact in the checkout, so it gets a step of its own with the
 * conversion as the only thing on it — never folded into the breakdown's
 * smallest type.
 *
 * Layout only. The lock's clock is `useFxCountdown`, the breakpoint rules are
 * `useCheckoutDialogLayout`, and each block of the disclosure is its own
 * molecule with its own reasoning.
 */
export function FxConfirmationDialog({
  open,
  quote,
  providerLabel,
  isLoading,
  isConfirming,
  error,
  onConfirm,
  onCancel,
  formatMoney,
  onRequote,
}: FxConfirmationDialogProps) {
  const { fullScreen } = useCheckoutDialogLayout();
  const remaining = useFxCountdown(open ? (quote?.expiresAt ?? null) : null);
  const expired = quote != null && remaining === 0;
  const needsRequote = expired || (!quote && !isLoading);

  return (
    // `onCancel` stays reachable even mid-confirm — see `CheckoutActions`.
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      // Same surface as the checkout under it: MUI's dark-mode elevation
      // overlay otherwise greys this step out against the warm frame.
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 4, backgroundImage: 'none' } }}
    >
      <DialogTitle component="div">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ProviderLogo id="paypal" decorative />
          <Typography variant="h6" component="h2">
            Confirm the amount in {quote?.currency ?? 'USD'}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && !quote ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }} aria-live="polite">
            <CircularProgress size={28} color="secondary" />
            <Typography variant="body2" color="text.secondary">
              Getting today&rsquo;s rate…
            </Typography>
          </Stack>
        ) : quote ? (
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              {providerLabel} cannot charge in {quote.baseCurrency}, so this payment is charged in{' '}
              {quote.currency}.
            </Typography>
            <FxAmountHero
              owed={formatMoney(quote.baseAmount, quote.baseCurrency)}
              charged={formatMoney(quote.amount, quote.currency)}
            />
            <Divider />
            <FxRateLines quote={quote} formatMoney={formatMoney} />
            <FxLockNotice remaining={remaining} />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        ) : (
          <Alert severity="error">
            {error ?? 'We could not work out the amount in this currency. Please try again.'}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {needsRequote ? (
          <CheckoutActions
            onCancel={onCancel}
            cancelLabel="Back"
            primaryLabel="Get updated amount"
            onPrimary={onRequote}
            isBusy={isLoading}
          />
        ) : (
          <CheckoutActions
            onCancel={onCancel}
            cancelLabel="Back"
            primaryLabel={
              isConfirming
                ? `Opening ${providerLabel}…`
                : `Pay ${quote ? formatMoney(quote.amount, quote.currency) : ''}`
            }
            onPrimary={onConfirm}
            primaryDisabled={!quote || isLoading}
            isBusy={isConfirming}
            primaryIcon={<OpenInNewIcon />}
          />
        )}
      </DialogActions>
    </Dialog>
  );
}
