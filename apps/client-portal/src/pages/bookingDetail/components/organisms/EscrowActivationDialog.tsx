import { Alert, Skeleton } from '@sinnapi/ui';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  CheckoutActions,
  CheckoutDialogFrame,
  CheckoutRailPicker,
  CheckoutSection,
  FxConfirmationDialog,
} from '@sinnapi/ui/payments';
import { formatMoney } from '@/lib/config';
import AdvanceRateControl from '@/components/paymentTerms/components/molecules/AdvanceRateControl';
import AdvanceConsentCheckbox from '@/components/paymentTerms/components/molecules/AdvanceConsentCheckbox';
import type { BookingDetailModel } from '@/lib/types';
import { useEscrowActivation } from '../../hooks/useEscrowActivation';
import AdvanceTermsPanel from '../molecules/AdvanceTermsPanel';
import SinglePaymentNotice from '../molecules/SinglePaymentNotice';
import EscrowCheckoutSummary from './EscrowCheckoutSummary';

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

const METHOD_HEADING = 'How would you like to pay?';

/**
 * The escrow checkout: choose the advance, pick a rail, see the real total,
 * then hand off to the provider.
 *
 * Layout only — `useEscrowActivation` owns the pricing, the chosen rate, the
 * rule about when the client may proceed and what the button says; the shared
 * `CheckoutDialogFrame` owns the responsive shell. The client is agreeing to
 * three separate things — how much money may reach the vendor before the
 * event, how they are paying, and that the total is more than the price they
 * negotiated — so each is a visible, numbered part of one screen.
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
  const c = useEscrowActivation({
    booking,
    open,
    needsAdvanceApproval,
    onAcceptTerms,
    isAcceptingTerms,
  });

  return (
    <CheckoutDialogFrame
      open={open}
      onClose={onClose}
      title="Pay through Sinnapi escrow"
      subtitle="Sinnapi holds your money and releases it to your vendor on the schedule you approve."
      summary={
        <EscrowCheckoutSummary
          quote={c.quote}
          currency={c.currency}
          rail={c.rail}
          formattedTotal={c.formattedTotal}
          isLoading={c.isQuoting}
          isRepricing={c.isRepricing}
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
      footerTotal={{ label: 'Total to pay', amount: c.formattedTotal }}
      overlays={
        // PayPal only: where the client accepts what the shilling total
        // becomes in the currency PayPal can charge. Nothing is created at
        // the provider until they do.
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
      <SinglePaymentNotice grossAmount={c.quote?.gross_amount ?? null} currency={c.currency} />

      <CheckoutSection
        step={1}
        title="Payment schedule"
        description={
          c.isAdvanceEditable
            ? 'Choose how much of your vendor’s fee is released before the event.'
            : undefined
        }
      >
        {c.quote ? (
          <AdvanceTermsPanel
            advanceRate={c.quote.advance_rate}
            advanceAmount={c.quote.advance_amount}
            balanceAmount={c.quote.balance_amount}
            daysBefore={c.quote.advance_release_days_before}
            releaseDueAt={c.quote.advance_release_due_at}
            currency={c.currency}
            note={booking.advance_terms_note}
            isRepricing={c.isRepricing}
            control={
              c.isAdvanceEditable && c.advanceLimit != null ? (
                <AdvanceRateControl
                  control={c.advance.form.control}
                  limit={c.advanceLimit}
                  value={c.advance.sliderValue}
                  onChange={c.advance.setRate}
                  disabled={c.isPaying}
                />
              ) : undefined
            }
          />
        ) : (
          <Skeleton variant="rounded" height={112} />
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

      {needsAdvanceApproval && (
        <AdvanceConsentCheckbox
          checked={c.agreed}
          onChange={c.setAgreed}
          disabled={c.isPaying}
          advanceAmount={c.quote?.advance_amount ?? null}
          currency={c.currency}
        />
      )}

      {acceptError && <Alert severity="error">{acceptError}</Alert>}
      {c.payError && <Alert severity="error">{c.payError}</Alert>}
    </CheckoutDialogFrame>
  );
}
