import { SectionCard, StatusTimeline } from '@sinnapi/ui';
import TimelineIcon from '@mui/icons-material/Timeline';
import { formatDateTime } from '@/lib/config';
import { useQuotationTimeline } from '../../hooks/useQuotationTimeline';

type Props = {
  quotationId: string;
  status: string;
};

/**
 * How the quote got to where it is, and what was expected next.
 *
 * For the console this is usually the reason the page was opened: the trail is
 * where the client's decline reason and the vendor's withdrawal reason are
 * recorded, and neither is on the quotation row. It is the only account of why
 * a quote ended the way it did.
 *
 * `StatusTimeline` reports a failed read in place rather than raising it to the
 * page-level error state — the trail is secondary to the quote, and a read that
 * failed here should not blank a screen an operator opened to check a figure.
 */
export default function QuotationTimelineCard({ quotationId, status }: Props) {
  const { steps, isLoading, error } = useQuotationTimeline(quotationId, status);

  return (
    <SectionCard title="Progress" icon={<TimelineIcon />} accent="info">
      <StatusTimeline
        steps={steps}
        formatTimestamp={formatDateTime}
        isLoading={isLoading}
        error={error}
      />
    </SectionCard>
  );
}
