import { Alert, QuotationActionDialog, SectionCard } from '@sinnapi/ui';
import BoltIcon from '@mui/icons-material/Bolt';
import type { QuotationDetailModel } from '@/lib/types';
import { useQuotationActions } from '../../hooks/useQuotationActions';
import QuotationActionButtons from '../molecules/QuotationActionButtons';
import MessageClientButton from '../molecules/MessageClientButton';

type Props = {
  quotation: QuotationDetailModel;
  isLapsed: boolean;
  onMessageClient: () => void;
  isMessaging: boolean;
};

/**
 * What the vendor can do about this quote right now.
 *
 * Pinned above the tabs rather than filed inside one of them, and that is the
 * point of it. Withdrawing a quote is a decision about the whole object, not a
 * detail of any one section, and a control that only exists on the tab a vendor
 * happens not to be on is a control they have to go hunting for. Everything
 * below the tabs is a record and can wait behind one; this cannot.
 *
 * MESSAGING IS ONE OF THOSE CONTROLS, and it is why the bar no longer vanishes
 * on a settled quote. It used to return `null` the moment no transition was
 * available, on the reasoning that a heading over an explanation of emptiness
 * is worse than nothing. That reasoning holds for transitions and not for this:
 * a client who declined a quote is exactly the person a vendor wants to ask
 * why, and a quote goes settled long before the relationship does. So the bar
 * now stands as long as there is either a move to make or someone to talk to,
 * and it only disappears when there is genuinely neither.
 *
 * Sending a quote is deliberately not here: that is the builder's submit, which
 * writes the line items and the price in one call and belongs to the form, in
 * the Quote tab.
 *
 * Layout only — `useQuotationActions` owns the gating, the write and the
 * confirmation state; `QuotationActionDialog` owns the modal.
 */
export default function QuotationActionBar({
  quotation,
  isLapsed,
  onMessageClient,
  isMessaging,
}: Props) {
  const actions = useQuotationActions(quotation);

  const canMessage = !!quotation.client_id;
  if (actions.actions.length === 0 && !canMessage) return null;

  const hasTransitions = actions.actions.length > 0;

  return (
    <SectionCard
      title={hasTransitions ? 'Manage quote' : 'Talk to the client'}
      icon={<BoltIcon />}
      accent="warning"
      subtitle={
        hasTransitions
          ? 'The client is told as soon as you act'
          : 'This quote is settled — you can still discuss it'
      }
      sx={{ mb: 3 }}
    >
      {isLapsed && hasTransitions && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This quote has passed its valid-until date, so the client can no longer accept it.
          Withdrawing it makes that explicit on their side.
        </Alert>
      )}

      <QuotationActionButtons
        actions={actions.actions}
        isBusy={actions.isBusy}
        onRequest={actions.request}
        trailing={
          canMessage ? <MessageClientButton onClick={onMessageClient} busy={isMessaging} /> : null
        }
      />

      <QuotationActionDialog
        action={actions.pending}
        reference={quotation.reference_no}
        reason={actions.reason}
        onReasonChange={actions.setReason}
        busy={actions.isBusy}
        error={actions.error}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />
    </SectionCard>
  );
}
