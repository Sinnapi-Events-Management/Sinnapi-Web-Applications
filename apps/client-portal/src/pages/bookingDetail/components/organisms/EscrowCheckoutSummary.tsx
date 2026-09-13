import { MoneyBreakdown } from '@sinnapi/ui';
import {
  CheckoutSummaryPanel,
  SecureCheckoutNote,
  checkoutProcessorLabel,
  type CheckoutRailOption,
} from '@sinnapi/ui/payments';
import type { EscrowQuoteModel } from '@/lib/types';
import { escrowChargeLines } from '../../schema/escrowCheckout';
import { breakdownMoney } from '../../utils/breakdownMoney';
import EscrowReleaseSplit from '../molecules/EscrowReleaseSplit';

type Props = {
  quote: EscrowQuoteModel | null;
  currency: string;
  /** The rail the fee is quoted for; also names who runs the hosted page. */
  rail: CheckoutRailOption;
  /** Formatted total, from the activation hook. */
  formattedTotal: string | null;
  isLoading: boolean;
  isRepricing: boolean;
};

/**
 * The escrow checkout's summary: what is charged, the total, how it is then
 * released, and where the payer finishes. Composes the shared summary panel;
 * only the escrow-specific lines are defined here.
 */
export default function EscrowCheckoutSummary({
  quote,
  currency,
  rail,
  formattedTotal,
  isLoading,
  isRepricing,
}: Props) {
  return (
    <CheckoutSummaryPanel
      title="Summary"
      totalLabel="Total to pay"
      totalAmount={formattedTotal}
      isLoading={isLoading || !quote}
      isUpdating={isRepricing}
      split={quote && <EscrowReleaseSplit quote={quote} currency={currency} />}
      footer={<SecureCheckoutNote rail={rail} />}
    >
      {quote && (
        <MoneyBreakdown
          wrapLabels
          currency={currency}
          format={breakdownMoney}
          lines={escrowChargeLines(quote, checkoutProcessorLabel(rail))}
        />
      )}
    </CheckoutSummaryPanel>
  );
}
