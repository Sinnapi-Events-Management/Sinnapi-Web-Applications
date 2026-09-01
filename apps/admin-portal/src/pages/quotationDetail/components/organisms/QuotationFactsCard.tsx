import { InfoRow, SectionCard, Stack } from '@sinnapi/ui';
import DescriptionIcon from '@mui/icons-material/Description';
import TagIcon from '@mui/icons-material/Tag';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import ReplyIcon from '@mui/icons-material/Reply';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CelebrationIcon from '@mui/icons-material/Celebration';
import LayersIcon from '@mui/icons-material/Layers';
import { formatDate, formatDateTime } from '@/lib/config';
import type { AdminQuotationDetailModel } from '@/lib/types';

type Props = { quotation: AdminQuotationDetailModel };

/**
 * The quote as a record: every stored fact, in the order an operator checking
 * one would look for them.
 *
 * Rows that only exist at a given stage — a sent stamp, a response stamp, a
 * revision number above one — appear only then rather than sitting empty the
 * rest of the time. The reference is copyable because it is the string an
 * operator pastes back into the support thread they came from.
 */
export default function QuotationFactsCard({ quotation: q }: Props) {
  return (
    <SectionCard title="Quotation details" icon={<DescriptionIcon />}>
      <Stack>
        <InfoRow
          label="Reference"
          icon={<TagIcon />}
          value={q.reference_no}
          copyValue={q.reference_no ?? undefined}
          mono
        />
        <InfoRow label="Requested on" icon={<HistoryIcon />} value={formatDateTime(q.created_at)} />
        {q.sent_at && (
          <InfoRow label="Sent on" icon={<SendIcon />} value={formatDateTime(q.sent_at)} />
        )}
        {q.responded_at && (
          <InfoRow
            label="Responded on"
            icon={<ReplyIcon />}
            value={formatDateTime(q.responded_at)}
          />
        )}
        {q.valid_until && (
          <InfoRow
            label="Valid until"
            icon={<EventAvailableIcon />}
            value={formatDate(q.valid_until)}
          />
        )}
        {q.event?.title && (
          <InfoRow
            label="Event"
            icon={<CelebrationIcon />}
            value={
              q.event.event_date
                ? `${q.event.title} · ${formatDate(q.event.event_date)}`
                : q.event.title
            }
          />
        )}
        {/* Version 1 is every quote's starting point and says nothing. */}
        {(q.version_no ?? 1) > 1 && (
          <InfoRow label="Revision" icon={<LayersIcon />} value={`v${q.version_no}`} />
        )}
      </Stack>
    </SectionCard>
  );
}
