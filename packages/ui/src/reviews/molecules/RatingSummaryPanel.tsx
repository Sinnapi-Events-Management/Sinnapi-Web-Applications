'use client';
import { Paper, Rating, Stack, Typography } from '@mui/material';

export type RatingSummaryPanelProps = {
  /** `vendors.avg_rating`. Arrives as a numeric, so it may be a string. */
  avgRating: number | string | null | undefined;
  /** `vendors.review_count`. */
  reviewCount: number | null | undefined;
  /**
   * `panel` is the standalone figure — a card, for a page that is about the
   * score. `inline` is one line of it, for a page whose subject is the reviews
   * themselves and which must not spend a screenful restating their average.
   */
  variant?: 'panel' | 'inline';
};

/**
 * The aggregate score, as a figure a visitor can weigh rather than a lone star
 * row: the number, the stars, and how many bookings it was averaged over.
 *
 * The count matters as much as the score — 4.9 from three clients and 4.9 from
 * ninety are different claims, and a rating shown without its denominator lets
 * the reader assume the flattering one. Both variants keep it for that reason;
 * what `inline` drops is the card around it and the sentence explaining where
 * the average came from, not the denominator.
 *
 * WHY THERE IS AN INLINE VARIANT. On the profile's Reviews tab this used to be
 * a full card at the top, and clients arriving to read reviews met a large
 * number instead — the complaint was having to scroll before reaching a single
 * review. The score still belongs there, as one line above them.
 *
 * Shared rather than portal-local because the client portal, the vendor's own
 * profile preview and the public site all show this same figure, and a score
 * that renders differently to a signed-out visitor than to the client about to
 * book is a claim that stops being trustworthy.
 */
export function RatingSummaryPanel({
  avgRating,
  reviewCount,
  variant = 'panel',
}: RatingSummaryPanelProps) {
  const rating = Number(avgRating ?? 0);
  const count = reviewCount ?? 0;

  if (variant === 'inline') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
        <Typography variant="h6" sx={{ lineHeight: 1 }}>
          {count > 0 ? rating.toFixed(1) : '—'}
        </Typography>
        <Rating
          value={rating}
          precision={0.5}
          size="small"
          readOnly
          aria-label={`Average rating ${count > 0 ? rating.toFixed(1) : 'not yet rated'} out of 5`}
        />
        <Typography variant="body2" color="text.secondary">
          {count > 0 ? `${count} ${count === 1 ? 'rating' : 'ratings'}` : 'No ratings yet'}
        </Typography>
      </Stack>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 3 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h3" sx={{ lineHeight: 1 }}>
            {count > 0 ? rating.toFixed(1) : '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            / 5
          </Typography>
        </Stack>

        <Stack spacing={0.5}>
          <Rating
            value={rating}
            precision={0.5}
            size="small"
            readOnly
            aria-label={`Average rating ${count > 0 ? rating.toFixed(1) : 'not yet rated'} out of 5`}
          />
          <Typography variant="body2" color="text.secondary">
            {count > 0
              ? `From ${count} ${count === 1 ? 'client' : 'clients'} who booked them`
              : 'No ratings yet'}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
