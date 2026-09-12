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
import type { PlanModel } from '@/lib/types';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import SubscriptionQuotePreview from '../molecules/SubscriptionQuotePreview';
import { changeTitle } from '../../schema';

type Props = {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  plan: PlanModel | null;
};

/**
 * The subscription checkout: see exactly what the plan costs and the period
 * it buys, pick a rail, then hand off to the provider.
 *
 * Layout only — `useSubscriptionCheckout` owns the pricing, the rail and the
 * idempotency key. Two explicit steps in one dialog, because the vendor is
 * agreeing to two separate things: what happens to their current period, and
 * how they are paying. Neither should be something they discover afterwards.
 */
export default function SubscriptionCheckoutDialog({ open, onClose, vendorId, plan }: Props) {
  const {
    quote,
    rails,
    railIndex,
    setRailIndex,
    rail,
    isQuoting,
    quoteError,
    pay,
    isPaying,
    payError,
    fx,
  } = useSubscriptionCheckout(vendorId, plan?.id, open);

  const title = quote ? changeTitle(quote) : plan ? `Pay for ${plan.name}` : 'Pay for plan';

  return (
    // `onClose`/Cancel stay reachable while `isPaying`. The checkout call
    // carries its own client-side timeout, but a vendor should never be
    // trapped in a modal with no way out for however long that takes —
    // dismissing here is safe; the request is left to resolve in the
    // background and the server's in-flight guard + idempotency key both
    // already assume a checkout attempt can be walked away from.
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
              What you pay
            </Typography>
            {quoteError ? (
              <Alert severity="error">{quoteError}</Alert>
            ) : (
              <SubscriptionQuotePreview quote={quote} isLoading={isQuoting} />
            )}
          </Box>

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

          {payError && <Alert severity="error">{payError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={pay}
          disabled={!quote || !!quoteError || isQuoting || isPaying}
          startIcon={<OpenInNewIcon />}
        >
          {isPaying
            ? 'Opening…'
            : rail.provider === 'paypal'
              ? 'Continue'
              : `Pay ${quote ? formatMoney(quote.amount, quote.currency) : ''}`}
        </Button>
      </DialogActions>

      {/* PayPal only. The plan is priced in shillings; this is where the
          vendor sees, and accepts, what that becomes in the currency PayPal
          can actually charge. */}
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
