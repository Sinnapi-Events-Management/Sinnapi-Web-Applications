import { Alert } from '@sinnapi/ui';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  CheckoutActions,
  CheckoutDialogFrame,
  CheckoutRailPicker,
  CheckoutSection,
  FxConfirmationDialog,
} from '@sinnapi/ui/payments';
import { formatMoney } from '@/lib/config';
import type { PlanModel } from '@/lib/types';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import { changeTitle } from '../../schema';
import SubscriptionPeriodDetails from '../molecules/SubscriptionPeriodDetails';
import SubscriptionCheckoutSummary from './SubscriptionCheckoutSummary';

type Props = {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  plan: PlanModel | null;
};

const METHOD_HEADING = 'How would you like to pay?';

/**
 * The subscription checkout: see exactly what the plan costs and the period
 * it buys, pick a rail, then hand off to the provider.
 *
 * Layout only — `useSubscriptionCheckout` owns the pricing, the rail, the
 * idempotency key and the button's words; the shared `CheckoutDialogFrame`
 * owns the responsive shell, so this checkout and the client's escrow
 * checkout are the same dialog with different contents.
 */
export default function SubscriptionCheckoutDialog({ open, onClose, vendorId, plan }: Props) {
  const c = useSubscriptionCheckout(vendorId, plan?.id, open);
  const title = c.quote ? changeTitle(c.quote) : plan ? `Pay for ${plan.name}` : 'Pay for plan';

  return (
    <CheckoutDialogFrame
      open={open}
      onClose={onClose}
      title={title}
      summary={
        <SubscriptionCheckoutSummary
          quote={c.quote}
          rail={c.rail}
          formattedTotal={c.formattedTotal}
          isLoading={c.isQuoting}
        />
      }
      actions={
        <CheckoutActions
          onCancel={onClose}
          primaryLabel={c.payLabel}
          onPrimary={c.pay}
          primaryDisabled={!c.canPay}
          isBusy={c.isPaying}
          primaryIcon={<OpenInNewIcon />}
        />
      }
      footerTotal={{ label: 'You pay', amount: c.formattedTotal }}
      overlays={
        // PayPal only: the plan is priced in shillings; this is where the
        // vendor accepts what that becomes in the currency PayPal can charge.
        <FxConfirmationDialog
          open={c.fx.open}
          quote={c.fx.quote}
          providerLabel={c.rail.label}
          isLoading={c.fx.isLoading}
          isConfirming={c.fx.isConfirming}
          error={c.fx.error}
          onConfirm={c.fx.confirm}
          onCancel={c.fx.cancel}
          onRequote={c.fx.requote}
          formatMoney={formatMoney}
        />
      }
    >
      <CheckoutSection step={1} title="Your plan period">
        {c.quoteError ? (
          <Alert severity="error">{c.quoteError}</Alert>
        ) : (
          <SubscriptionPeriodDetails quote={c.quote} isLoading={c.isQuoting} />
        )}
      </CheckoutSection>

      <CheckoutSection step={2} title={METHOD_HEADING}>
        <CheckoutRailPicker
          rails={c.rails}
          selected={c.railIndex}
          onSelect={c.setRailIndex}
          disabled={c.isPaying}
          label={METHOD_HEADING}
        />
      </CheckoutSection>

      {c.payError && <Alert severity="error">{c.payError}</Alert>}
    </CheckoutDialogFrame>
  );
}
