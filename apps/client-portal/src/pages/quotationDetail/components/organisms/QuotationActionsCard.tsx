import { Alert, QuotationActionDialog, SectionCard, Typography } from '@sinnapi/ui';
import BoltIcon from '@mui/icons-material/Bolt';
import type { QuotationDetailModel } from '@/lib/types';
import { useQuotationActions } from '../../hooks/useQuotationActions';
import QuotationActionButtons from '../molecules/QuotationActionButtons';

type Props = { quotation: QuotationDetailModel };

/**
 * What the client can do about this quote's state right now.
 *
 * Deliberately separate from "Next steps", which is a set of links elsewhere.
 * This card holds the controls that change the quotation itself, and mixing a
 * status write in among navigation is how someone taps one without meaning to.
 *
 * The card disappears entirely once the quote is settled rather than showing a
 * heading over an explanation of why it is empty — except when the only thing
 * standing between the client and an Accept is the validity date, which is
 * worth a sentence because it is the one blocked case they can act on, by
 * asking the vendor for a fresh quote.
 *
 * Layout only — `useQuotationActions` owns the gating, the write and the
 * confirmation state; `QuotationActionDialog` owns the modal.
 */
export default function QuotationActionsCard({ quotation }: Props) {
  const actions = useQuotationActions(quotation);

  if (actions.actions.length === 0 && !actions.lapsedBlocksAccept) return null;

  return (
    <SectionCard
      title="Your response"
      icon={<BoltIcon />}
      accent={actions.lapsedBlocksAccept ? 'warning' : 'secondary'}
      subtitle={actions.lapsedBlocksAccept ? undefined : 'The vendor is told as soon as you decide'}
    >
      {actions.lapsedBlocksAccept && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This quote has passed its valid-until date, so it can no longer be accepted. Message the
          vendor to ask for a fresh one.
        </Alert>
      )}

      {actions.actions.length > 0 ? (
        <QuotationActionButtons
          actions={actions.actions}
          isBusy={actions.isBusy}
          onRequest={actions.request}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          There is nothing left to respond to on this quotation.
        </Typography>
      )}

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
