import { QuotationFeedbackCallout, type QuotationFeedback } from '@sinnapi/ui';
import { formatDateTime } from '@/lib/config';
import MessageVendorButton from '../molecules/MessageVendorButton';

type Props = {
  feedback: QuotationFeedback | null;
  onMessageVendor: () => void;
  isStarting: boolean;
};

/**
 * The last word on this quote, above the tabs.
 *
 * WHY IT IS HERE AND NOT IN A SECTION
 * It answers the question the client arrived with. A quote that reads `revised`
 * is one they sent back days ago, and "sent back saying what?" is the only
 * thing they want to know — but the sentence was written to
 * `quotation_status_history.reason`, which only `StatusTimeline` renders, which
 * only the Progress tab shows. Filing the answer in a section is what caused
 * the problem; the fix cannot be another section.
 *
 * It sits above the response bar rather than below it, and that order is the
 * point: the note is the context for the response, so it is read first.
 *
 * ONE ACTION, AND ONLY WHILE THE THREAD IS LIVE. Unlike the vendor's mirror
 * there is no "update the quote" here — reworking the price is the vendor's
 * move, and this side's only useful answer to a wait is to ask about it. On a
 * settled quote even that goes: a voided quotation's note is a record, and
 * buttons on a record invite work that can no longer be done.
 */
export default function QuotationFeedbackBanner({ feedback, onMessageVendor, isStarting }: Props) {
  if (!feedback) return null;

  const canAct = feedback.isOutstanding && feedback.kind === 'changes-requested';

  return (
    <QuotationFeedbackCallout
      feedback={feedback}
      viewer="client"
      formatTimestamp={formatDateTime}
      actions={
        canAct ? (
          <MessageVendorButton
            onClick={onMessageVendor}
            busy={isStarting}
            label="Ask about the rework"
          />
        ) : null
      }
    />
  );
}
