import { Stack, InfoRow, SectionCard } from '@sinnapi/ui';
import DescriptionIcon from '@mui/icons-material/Description';
import TagIcon from '@mui/icons-material/Tag';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CelebrationIcon from '@mui/icons-material/Celebration';
import NotesIcon from '@mui/icons-material/Notes';
import LayersIcon from '@mui/icons-material/Layers';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { formatDate, formatDateTime } from '@/lib/config';
import { one } from '@/lib/rel';
import type { EventRefModel, QuotationDetailModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  event: EventRefModel | null;
};

/**
 * The quote as a record: every stored fact, in the order someone checking one
 * would look for them. Rows that only exist at a given stage — a sent stamp, a
 * revision number above one — appear only then rather than sitting empty the
 * rest of the time.
 */
export default function QuotationFactsCard({ quotation: q, event }: Props) {
  const eventType = one<{ id: string; name: string }>(q.event_types);

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
        {q.valid_until && (
          <InfoRow
            label="Valid until"
            icon={<EventAvailableIcon />}
            value={formatDate(q.valid_until)}
          />
        )}
        {/* What the client told the vendor at request time, as opposed to the
            planned-event row below it. On a package order these two are the
            whole agreement besides the price, so they are read back here — a
            client checking "did I give them the right address?" should not have
            to re-open the order dialog to find out. */}
        {q.event_date && (
          <InfoRow
            label="Event date"
            icon={<EventOutlinedIcon />}
            value={
              eventType?.name
                ? `${formatDate(q.event_date)} · ${eventType.name}`
                : formatDate(q.event_date)
            }
          />
        )}
        {q.event_address && (
          <InfoRow
            label="Event address"
            icon={<PlaceOutlinedIcon />}
            value={q.event_address}
            copyValue={q.event_address}
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
        {q.request_details && (
          <InfoRow label="Your request" icon={<NotesIcon />} value={q.request_details} />
        )}
      </Stack>
    </SectionCard>
  );
}
