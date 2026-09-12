'use client';
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SouthIcon from '@mui/icons-material/South';

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
  /** The rail's name, for the button and the title. */
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
 * WHY THIS IS ITS OWN STEP
 * PayPal cannot accept shillings, so a client who agreed to a figure in UGX is
 * about to be charged a different-looking number in USD. Folding that into the
 * existing breakdown would put the most surprising fact in the checkout — "the
 * amount I approved is not the amount on my statement" — in the smallest type
 * on the screen. It gets a step of its own, one decision per screen, and the
 * conversion is the only thing on it.
 *
 * WHAT IT DISCLOSES, AND WHY EACH PART
 * The obligation and the charge are shown at equal weight with the rate
 * between them, so neither currency reads as the "real" one. The margin is a
 * named line rather than something blended into the rate, because a payer who
 * compares our rate against a search result should be able to see exactly
 * where the difference went. The rate's true age is always stated — including
 * when it is older than we would like — since a rate with no timestamp is a
 * claim rather than a disclosure.
 *
 * THE LOCK IS A PROMISE, SO IT IS VISIBLE
 * The quote is held for a fixed window and the charge is re-derived from it
 * server-side, which means this figure is what will be taken. The countdown is
 * shown so that promise is legible, and when it lapses the payer is asked to
 * re-quote rather than being sent to PayPal against a stale figure.
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
  const remaining = useCountdown(open ? (quote?.expiresAt ?? null) : null);
  const expired = quote != null && remaining === 0;

  return (
    // `onCancel` stays reachable even mid-confirm. The checkout call this
    // dialog is waiting on carries its own client-side timeout, but that
    // still leaves a real window with nothing on screen to do — and a
    // slow provider or a dropped connection is not a reason to trap someone
    // in a modal with no way out. Dismissing here does not cancel the
    // in-flight request; it is safe to let it resolve in the background
    // (the server's in-flight guard and idempotency key both assume exactly
    // this can happen) and simply stop making the payer stare at it.
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Confirm the amount</DialogTitle>
      <DialogContent dividers>
        {isLoading && !quote ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Getting today&rsquo;s rate…
            </Typography>
          </Stack>
        ) : quote ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {providerLabel} cannot charge in {quote.baseCurrency}, so this booking is paid in{' '}
              {quote.currency}.
            </Typography>

            {/* Both currencies at equal weight. Neither is the small print. */}
            <Box
              sx={(theme) => ({
                borderRadius: 2,
                p: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              })}
            >
              <Stack spacing={0.75} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Booking total
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {formatMoney(quote.baseAmount, quote.baseCurrency)}
                </Typography>

                <SouthIcon fontSize="small" sx={{ color: 'text.disabled', my: 0.25 }} />

                <Typography variant="caption" color="text.secondary">
                  You will be charged
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {formatMoney(quote.amount, quote.currency)}
                </Typography>
              </Stack>
            </Box>

            <Divider />

            {/* The working. Every line the total is built from, named. */}
            <Stack spacing={1}>
              <FxLine
                label="Market rate"
                value={`1 ${quote.currency} = ${formatMoney(quote.midRate, quote.baseCurrency)}`}
              />
              <FxLine
                label={`Conversion fee (${formatPercent(quote.marginRate)})`}
                value={formatMoney(quote.marginAmount, quote.baseCurrency)}
              />
              <FxLine
                label="Your rate"
                value={`1 ${quote.currency} = ${formatMoney(quote.effectiveRate, quote.baseCurrency)}`}
                emphasis
              />
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Rate updated {relativeAge(quote.rateFetchedAt)}.
              {quote.rateStale
                ? ' Live rates are briefly unavailable, so this is the most recent rate on file.'
                : ''}
            </Typography>

            {expired ? (
              <Alert severity="warning">
                This rate has expired. Get an updated amount before continuing.
              </Alert>
            ) : (
              <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                <Typography variant="caption">
                  This amount is held for <strong>{formatRemaining(remaining)}</strong>. You will be
                  charged exactly this, whatever the rate does next.
                </Typography>
              </Alert>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        ) : (
          <Alert severity="error">
            {error ?? 'We could not work out the amount in this currency. Please try again.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel}>Back</Button>
        {expired || (!quote && !isLoading) ? (
          <Button variant="contained" onClick={onRequote} disabled={isLoading}>
            Get updated amount
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={onConfirm}
            disabled={!quote || isLoading || isConfirming}
            startIcon={<OpenInNewIcon />}
          >
            {isConfirming
              ? 'Opening…'
              : `Pay ${quote ? formatMoney(quote.amount, quote.currency) : ''}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function FxLine({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
      <Typography variant="body2" color={emphasis ? 'text.primary' : 'text.secondary'}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={emphasis ? 700 : 500}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Seconds left on the lock, ticking. Null target means no countdown — which is
 * also what stops the interval while the dialog is closed.
 */
function useCountdown(expiresAt: string | null): number {
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    setRemaining(secondsUntil(expiresAt));
    if (!expiresAt) return;
    const id = setInterval(() => setRemaining(secondsUntil(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function secondsUntil(iso: string | null): number {
  if (!iso) return 0;
  const ms = Date.parse(iso) - Date.now();
  return ms > 0 ? Math.floor(ms / 1000) : 0;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPercent(rate: number): string {
  const pct = rate * 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

/** Deliberately plain-spoken: "3 hours ago" reads truer than a timestamp. */
function relativeAge(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (!Number.isFinite(seconds)) return 'recently';
  if (seconds < 90) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
