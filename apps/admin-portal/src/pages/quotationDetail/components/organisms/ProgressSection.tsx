import QuotationTimelineCard from './QuotationTimelineCard';

type Props = {
  quotationId: string;
  status: string;
};

/**
 * How the quote got to where it is. One card, full width — the trail is a list
 * of dated rows, each of which may carry a party's stated reason, and splitting
 * it into a column would only make every reason wrap sooner.
 *
 * The card reports its own loading and failure in place, so this section never
 * renders nothing.
 */
export default function ProgressSection({ quotationId, status }: Props) {
  return <QuotationTimelineCard quotationId={quotationId} status={status} />;
}
