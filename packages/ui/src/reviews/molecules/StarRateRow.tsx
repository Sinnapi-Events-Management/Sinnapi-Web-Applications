'use client';
import { useEffect, useState } from 'react';
import { Box, Button, Rating, Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { ratingShortLabel } from '../schema/reviewRules';

export type StarRateRowProps = {
  /** The rating already saved, or `null`/`undefined` when none has been left. */
  value: number | null | undefined;
  /** The one line above the stars. Name the vendor in it where there is room. */
  prompt?: string;
  /**
   * Saves the tapped rating. Called on the tap itself — there is no second
   * step, so this must write, not open something.
   */
  onRate: (rating: number) => void;
  /** A tap is in flight. */
  isSaving?: boolean;
  /** A tap has saved since this row mounted, so the confirmation line shows. */
  justSaved?: boolean;
  /** Opens the composer for the headline and the words, both optional. */
  onAddWords?: () => void;
  /** Label for that button — "Add a few words" reads differently once written. */
  addWordsLabel?: string;
  /** Greys the stars out. `disabledReason` is printed underneath. */
  disabled?: boolean;
  disabledReason?: string | null;
  /** A failed write, already turned into a sentence by `reviewError`. */
  error?: string | null;
};

/**
 * Five stars that save the moment one is tapped.
 *
 * WHY THE TAP IS THE WHOLE INTERACTION. Rating a vendor used to mean finding a
 * button, opening a modal, choosing a star, and pressing Publish past two empty
 * text fields — four deliberate acts, three of them about our data model rather
 * than the client's opinion. Clients told us the review screens were too much
 * reading, and the people saying so are rating a vendor on a phone in a
 * language they read slowly. A rating is one decision, so it is one tap, and
 * the rating alone is a complete review: `create_review` blanks an empty title
 * and body, so nothing is skipped by not typing.
 *
 * WHY AN ACCIDENTAL TAP IS SURVIVABLE. The write is reversible by the same
 * gesture: tapping a different star calls `update_review`, and the author's
 * edit window stays open until the vendor replies. That is what makes saving
 * without a confirmation step honest rather than careless — and it is why the
 * confirmation line says the rating can still be changed instead of thanking
 * the client.
 *
 * THE WORDS ARE OFFERED AFTER, NEVER BEFORE. `onAddWords` opens the composer
 * once there is a rating to attach them to. A client who has nothing to add has
 * already finished, and never sees a text field.
 *
 * The tapped value is held locally as well as read from the server, so the star
 * fills under the thumb instead of after the round trip. A refused write clears
 * that local value, because stars showing a rating the server rejected are a
 * lie the client would have no reason to doubt.
 */
export function StarRateRow({
  value,
  prompt,
  onRate,
  isSaving = false,
  justSaved = false,
  onAddWords,
  addWordsLabel = 'Add a few words',
  disabled = false,
  disabledReason,
  error,
}: StarRateRowProps) {
  const [touched, setTouched] = useState<number | null>(null);

  // A refused write must not leave the stars showing the refused rating.
  useEffect(() => {
    if (error) setTouched(null);
  }, [error]);

  const shown = touched ?? value ?? null;

  return (
    <Box>
      {prompt && (
        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
          {prompt}
        </Typography>
      )}

      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
        <Rating
          value={shown}
          max={5}
          disabled={disabled || isSaving}
          // `next` is null when the client taps the star already selected, which
          // MUI treats as clearing. A rating cannot be unset — there is no such
          // row — so that tap is ignored rather than sent as a null rating.
          onChange={(_, next) => {
            if (next == null) return;
            setTouched(next);
            onRate(next);
          }}
          icon={<StarRoundedIcon fontSize="inherit" />}
          emptyIcon={<StarOutlineRoundedIcon fontSize="inherit" />}
          sx={{
            // Larger than any other rating in the product and deliberately so:
            // this is the one that gets tapped, with a thumb, outdoors, often
            // on the day of the event. The side padding is the touch target.
            fontSize: { xs: '2.5rem', sm: '2.75rem' },
            '& .MuiRating-icon': { px: 0.25 },
          }}
        />

        {/* Holds its line whether or not there is a word in it, so the stars do
            not jump upward under the thumb that just tapped them. */}
        <Typography
          variant="body1"
          color={shown ? 'text.primary' : 'text.secondary'}
          sx={{ minHeight: 24 }}
        >
          {isSaving ? 'Saving…' : shown ? ratingShortLabel(shown) : 'Tap a star'}
        </Typography>
      </Stack>

      {justSaved && !isSaving && !error && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'success.main' }} />
          <Typography variant="body2" color="text.secondary">
            Saved. You can change it any time.
          </Typography>
        </Stack>
      )}

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
          {error}
        </Typography>
      )}

      {disabled && disabledReason && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {disabledReason}
        </Typography>
      )}

      {onAddWords && !disabled && (
        <Button
          size="small"
          onClick={onAddWords}
          disabled={isSaving}
          sx={{ mt: 0.5, px: 0.5, alignSelf: 'flex-start' }}
        >
          {addWordsLabel}
        </Button>
      )}
    </Box>
  );
}
