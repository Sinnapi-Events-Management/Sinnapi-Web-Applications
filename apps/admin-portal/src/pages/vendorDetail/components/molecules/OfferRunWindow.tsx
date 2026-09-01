import { Stack, Typography } from '@sinnapi/ui';
import DateRangeOutlinedIcon from '@mui/icons-material/DateRangeOutlined';
import { formatDate } from '@/lib/config';
import type { AdminOfferModel } from '@/lib/types';

/**
 * When this offer ran, in the past tense once it has.
 *
 * WHY THE SHARED DEADLINE CHIP IS NOT ENOUGH HERE
 * `OfferDeadlineChip` renders nothing once the deadline has passed, and that is
 * correct everywhere it was written for: a client-facing card for an ended
 * offer should not be on screen at all. This tab is the one place that
 * deliberately shows them — a withdrawn campaign from last month is often the
 * most relevant thing on a vendor's page — and without this line those cards
 * would carry no date whatsoever, which is the single fact an operator
 * reconstructing a complaint needs first.
 *
 * An offer with no end date says so rather than showing one date and a gap.
 * Open-ended is a real state a vendor can create and it is worth an operator's
 * attention on its own.
 */
export default function OfferRunWindow({ offer }: { offer: AdminOfferModel }) {
  const label = runLabel(offer);

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <DateRangeOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled', flexShrink: 0 }} />
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
    </Stack>
  );
}

/**
 * Past or present tense by the deadline, not by `status`.
 *
 * A withdrawn offer whose end date is still in the future is a campaign that
 * WOULD be running — "ran until" would tell an operator it had lapsed on its
 * own, which is the opposite of what the console did to it.
 */
function runLabel(offer: AdminOfferModel): string {
  const ends = offer.ends_at ? Date.parse(offer.ends_at) : null;
  const isOver = ends != null && Number.isFinite(ends) && ends < Date.now();

  if (offer.starts_at && offer.ends_at) {
    return `${isOver ? 'Ran' : 'Runs'} ${formatDate(offer.starts_at)} – ${formatDate(offer.ends_at)}`;
  }
  if (offer.ends_at) return `${isOver ? 'Ended' : 'Ends'} ${formatDate(offer.ends_at)}`;
  if (offer.starts_at) return `From ${formatDate(offer.starts_at)} · no end date`;
  return 'No start or end date';
}
