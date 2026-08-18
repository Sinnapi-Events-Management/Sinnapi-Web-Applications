import { SectionCard, StatusTimeline } from '@sinnapi/ui';
import TimelineIcon from '@mui/icons-material/Timeline';
import { formatDateTime } from '@/lib/config';
import { useQuotationTimeline } from '../../hooks/useQuotationTimeline';

type Props = {
  quotationId: string;
  status: string;
};

/**
 * How the quote got to where it is, and what is expected next.
 *
 * The trail is secondary to the quote itself, so `StatusTimeline` reports a
 * failed read in place rather than raising it to the page-level error state.
 * It is also where the client's reason for declining or sending the quote back
 * shows up — which is the whole answer to "why am I looking at this again".
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
