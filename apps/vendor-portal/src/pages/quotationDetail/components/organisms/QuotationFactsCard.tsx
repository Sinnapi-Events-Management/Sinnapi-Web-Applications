import { Stack, InfoRow, SectionCard } from '@sinnapi/ui';
import DescriptionIcon from '@mui/icons-material/Description';
import TagIcon from '@mui/icons-material/Tag';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CelebrationIcon from '@mui/icons-material/Celebration';
import LayersIcon from '@mui/icons-material/Layers';
import { formatDate, formatDateTime } from '@/lib/config';
import type { DirectoryProfile, EventRefModel, QuotationDetailModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  client: DirectoryProfile | null;
  event: EventRefModel | null;
};

/**
 * The quote as a record: every stored fact, in the order someone checking one
 * would look for them. Rows that only exist at a given stage — a sent stamp, a
 * revision number above one — appear only then rather than sitting empty the
 * rest of the time.
 *
 * The advance terms used to be one of these rows, reduced to a percentage and a
 * number of days. They are now their own card, next to the money they divide,
 * which is the form the client has always seen them in. Saying it twice in two
 * levels of detail would leave a vendor comparing their own page against
 * itself.
 */
export default function QuotationFactsCard({ quotation: q, client, event }: Props) {
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
        <InfoRow label="Client" icon={<PersonIcon />} value={client?.full_name ?? 'Client'} />
        <InfoRow label="Requested on" icon={<HistoryIcon />} value={formatDateTime(q.created_at)} />
        {q.sent_at && (
          <InfoRow label="Sent on" icon={<SendIcon />} value={formatDateTime(q.sent_at)} />
        )}
        {q.valid_until && (
          <InfoRow
            label="Valid until"
            icon={<EventAvailableIcon />}
            value={formatDate(q.valid_until)}
          />
        )}
        {event?.title && (
          <InfoRow
            label="Event"
            icon={<CelebrationIcon />}
            value={
              event.event_date ? `${event.title} · ${formatDate(event.event_date)}` : event.title
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
