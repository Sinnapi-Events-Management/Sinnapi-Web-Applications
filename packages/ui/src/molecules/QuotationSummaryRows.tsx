'use client';
import { Stack } from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import SendIcon from '@mui/icons-material/Send';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HistoryIcon from '@mui/icons-material/History';
import PaidIcon from '@mui/icons-material/Paid';
import LayersIcon from '@mui/icons-material/Layers';
import { InfoRow } from './InfoRow';
import { formatAmount } from './money';
import { formatDay } from './datetime';

/** The quotation header fields every portal reads off the same document. */
export type QuotationSummaryLike = {
  reference_no?: string | null;
  /** Set by `send_quotation`; null while the vendor is still building it. */
  sent_at?: string | null;
  valid_until?: string | null;
  created_at?: string | null;
  /** Bumped by each revision; only shown once there has been more than one. */
  version_no?: number | null;
};

export type QuotationSummaryRowsProps = {
  quotation: QuotationSummaryLike;
  /** The resolved total, from `quotationPricing` — not the stored column. */
  total: number | string | null | undefined;
  currency?: string | null;
  /** Label on the money row; the booking pages call it what was quoted. */
  totalLabel?: string;
};

/**
 * A quotation's identity and dates, as a record.
 *
 * Shared verbatim across the portals because it is the half of a quotation
 * that is not a matter of perspective: the reference is what all three parties
 * quote at each other, and the validity date is what decides whether the price
 * still stands. Only the interpretation around it differs by audience, and
 * that lives in the card doing the wrapping.
 *
 * The reference is copyable and monospaced for the same reason it is on every
 * other detail page: it gets pasted into support threads, and a transcription
 * error there costs more than the affordance does.
 */
export function QuotationSummaryRows({
  quotation: q,
  total,
  currency,
  totalLabel = 'Quoted total',
}: QuotationSummaryRowsProps) {
  return (
    <Stack>
      <InfoRow
        label="Reference"
        icon={<TagIcon />}
        value={q.reference_no}
        copyValue={q.reference_no ?? undefined}
        mono
      />

      {/* A quote that was never sent has no date to show and a "—" next to
          "Sent" invites the question the row was meant to answer. The
          created date covers it instead: something did happen, on a day. */}
      {q.sent_at ? (
        <InfoRow label="Sent" icon={<SendIcon />} value={formatDay(q.sent_at)} />
      ) : (
        <InfoRow label="Requested" icon={<HistoryIcon />} value={formatDay(q.created_at)} />
      )}

      {q.valid_until && (
        <InfoRow label="Valid until" icon={<EventBusyIcon />} value={formatDay(q.valid_until)} />
      )}

      {/* A first version is just "the quote"; a third one is a negotiation,
          and knowing which one the booking came from is the point. */}
      {q.version_no != null && q.version_no > 1 && (
        <InfoRow label="Revision" icon={<LayersIcon />} value={`Version ${q.version_no}`} />
      )}

      <InfoRow
        label={totalLabel}
        icon={<PaidIcon />}
        value={formatAmount(total, currency ?? 'UGX')}
      />
    </Stack>
  );
}
