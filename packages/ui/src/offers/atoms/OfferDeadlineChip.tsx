'use client';
import { Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { offerIsEndingSoon, offerTimeLeft } from '../schema/offerCopy';
import { useOfferClock } from '../hooks/useOfferClock';

export type OfferDeadlineChipProps = {
  endsAt: string | null | undefined;
  /**
   * The clock every row on this screen was resolved against.
   *
   * Passed in rather than read here for the reason `usePromotions` gives about
   * `useNow`: a grid where each chip called `Date.now()` would tick thirty
   * cards to "Ended" at thirty different instants, and two cards with the same
   * deadline could render two different countdowns.
   *
   * Omitting it falls back to this chip's own clock, which is undefined until
   * mount — so a server-rendered page emits nothing here rather than a
   * countdown computed against the server's clock and then contradicted at
   * hydration. See `useOfferClock`.
   */
  now?: number;
  size?: 'small' | 'medium';
};

/**
 * How long a client has left, and how loudly to say it.
 *
 * Neutral until the last two days, then `warning`. A deadline that looks urgent
 * for three weeks has taught the reader to ignore it by the time it matters,
 * which is the failure mode of every countdown that is always red.
 *
 * Renders nothing once the deadline has passed. A card for an ended offer
 * should not be on screen at all — the read filters those out — and a chip
 * saying "Ended" on a card still offering a price would be the card arguing
 * with itself.
 */
export function OfferDeadlineChip({ endsAt, now, size = 'small' }: OfferDeadlineChipProps) {
  const clock = useOfferClock();
  const at = now ?? clock;

  // `at` is undefined on the server and on the first client render. Both emit
  // nothing, which is what keeps the two identical.
  const label = at == null ? null : offerTimeLeft(endsAt, at);
  if (!label) return null;

  const urgent = offerIsEndingSoon(endsAt, at);

  return (
    <Chip
      size={size}
      variant="outlined"
      icon={<ScheduleRoundedIcon />}
      label={label}
      sx={{
        fontWeight: urgent ? 700 : 500,
        ...(urgent
          ? {
              color: 'warning.main',
              borderColor: (t) => alpha(t.palette.warning.main, 0.5),
              bgcolor: (t) =>
                alpha(t.palette.warning.main, t.palette.mode === 'dark' ? 0.16 : 0.09),
              '& .MuiChip-icon': { color: 'inherit' },
            }
          : { color: 'text.secondary' }),
      }}
    />
  );
}
