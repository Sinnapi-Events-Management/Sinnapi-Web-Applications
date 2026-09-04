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
import { CheckoutRailPicker } from '@sinnapi/ui/payments';
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
  const { quote, rails, railIndex, setRailIndex, isQuoting, quoteError, pay, isPaying, payError } =
    useSubscriptionCheckout(vendorId, plan?.id, open);

  const title = quote ? changeTitle(quote) : plan ? `Pay for ${plan.name}` : 'Pay for plan';

  return (
    <Dialog open={open} onClose={isPaying ? undefined : onClose} maxWidth="sm" fullWidth>
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
        <Button onClick={onClose} disabled={isPaying}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={pay}
          disabled={!quote || !!quoteError || isQuoting || isPaying}
          startIcon={<OpenInNewIcon />}
        >
          {isPaying ? 'Opening…' : `Pay ${quote ? formatMoney(quote.amount, quote.currency) : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
