import { Alert, QuotationActionDialog, SectionCard } from '@sinnapi/ui';
import BoltIcon from '@mui/icons-material/Bolt';
import type { QuotationDetailModel } from '@/lib/types';
import { useQuotationActions } from '../../hooks/useQuotationActions';
import QuotationActionButtons from '../molecules/QuotationActionButtons';

type Props = {
  quotation: QuotationDetailModel;
  isLapsed: boolean;
};

/**
 * What the vendor can do about this quote's state right now.
 *
 * The card disappears entirely once the quote is settled rather than showing a
 * heading over an explanation of why it is empty. Sending a quote is not here —
 * that is the builder's submit, which writes the line items and the price in
 * one call and belongs to the form.
 *
 * Layout only — `useQuotationActions` owns the gating, the write and the
 * confirmation state; `QuotationActionDialog` owns the modal.
 */
export default function QuotationActionsCard({ quotation, isLapsed }: Props) {
  const actions = useQuotationActions(quotation);

  if (actions.actions.length === 0) return null;

  return (
    <SectionCard
      title="Manage quote"
      icon={<BoltIcon />}
      accent="warning"
      subtitle="The client is told as soon as you act"
    >
      {isLapsed && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This quote has passed its valid-until date, so the client can no longer accept it.
          Withdrawing it makes that explicit on their side.
        </Alert>
      )}

      <QuotationActionButtons
        actions={actions.actions}
        isBusy={actions.isBusy}
        onRequest={actions.request}
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
