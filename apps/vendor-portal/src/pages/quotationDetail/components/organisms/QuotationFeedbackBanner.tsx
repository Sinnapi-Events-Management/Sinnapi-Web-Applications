import { Button, QuotationFeedbackCallout, type QuotationFeedback } from '@sinnapi/ui';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { formatDateTime } from '@/lib/config';
import MessageClientButton from '../molecules/MessageClientButton';

type Props = {
  feedback: QuotationFeedback | null;
  onMessageClient: () => void;
  onOpenQuote: () => void;
  isStarting: boolean;
};

/**
 * The client's last word on this quote, above the tabs.
 *
 * WHY IT IS HERE AND NOT IN A SECTION
 * It answers the question the vendor arrived with. A quote whose status reads
 * `revised` is a quote the client sent back, and "sent back saying what?" is
 * the only thing they want to know — but the sentence was written to
 * `quotation_status_history.reason`, which only `StatusTimeline` renders, which
 * only the Progress tab shows. Three taps, with nothing on the way there
 * hinting the sentence existed. Filing the answer in a section is what caused
 * the problem; the fix cannot be another section.
 *
 * It sits above the action bar rather than below it, and that order is the
 * point: the request is the reason for the actions, so it is read first.
 *
 * ACTIONS ONLY WHILE THE ASK IS LIVE. A settled quote's note is a record, and a
 * record with buttons on it invites work that has already been done or can no
 * longer be done. `isOutstanding` is what draws the line — see
 * `latestQuotationFeedback`.
 */
export default function QuotationFeedbackBanner({
  feedback,
  onMessageClient,
  onOpenQuote,
  isStarting,
}: Props) {
  if (!feedback) return null;

  const canAct = feedback.isOutstanding && feedback.kind === 'changes-requested';

  return (
    <QuotationFeedbackCallout
      feedback={feedback}
      viewer="vendor"
      formatTimestamp={formatDateTime}
      actions={
        canAct ? (
          <>
            {/* Reworking the quote is the answer to a revision request, so it
                leads. It is a jump to the builder rather than a write — the
                edit itself belongs to the form in the Quote tab. */}
            <Button
              variant="contained"
              color="primary"
              startIcon={<ReceiptLongOutlinedIcon />}
              onClick={onOpenQuote}
            >
              Update the quote
            </Button>
            <MessageClientButton onClick={onMessageClient} busy={isStarting} />
          </>
        ) : null
      }
    />
  );
}
