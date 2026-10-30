'use client';
import { Rating, Stack, Typography } from '@mui/material';
import { ratingShortLabel } from '../schema/reviewRules';

export type RatingValueProps = {
  rating: number | null | undefined;
  size?: 'small' | 'medium';
  /** Append the named step ("Good", "Excellent") after the stars. */
  withLabel?: boolean;
};

/**
 * A rating as read-only stars, optionally named.
 *
 * The named step is what makes the stars mean something — see `RATING_LABELS`.
 * Kept as an atom because four surfaces draw the same row (a review in a list,
 * a review in the client's own queue, the composer's current value, a vendor
 * profile item) and an inline `<Rating readOnly />` in each is how the sizes
 * drifted apart the last time.
 */
export function RatingValue({ rating, size = 'small', withLabel = false }: RatingValueProps) {
  const value = rating ?? 0;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Rating
        value={value}
        max={5}
        size={size}
        readOnly
        // Without this the stars are the only thing announced and a screen
        // reader hears "5 stars" with no subject.
        aria-label={`Rated ${value} out of 5`}
      />
      {withLabel && (
        <Typography variant="caption" color="text.secondary">
          {ratingShortLabel(rating)}
        </Typography>
      )}
    </Stack>
  );
}
