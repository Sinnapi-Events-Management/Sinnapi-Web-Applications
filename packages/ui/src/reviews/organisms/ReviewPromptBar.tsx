'use client';
import { Paper, Stack, Typography } from '@mui/material';
import LockClockIcon from '@mui/icons-material/LockClock';
import { StarRateRow } from '../molecules/StarRateRow';
import { reviewEligibility } from '../schema/reviewRules';
import type { VendorReviewState } from '../types';

export type ReviewPromptBarProps = {
  state: VendorReviewState | null | undefined;
  /** Named in the prompt, so the client knows who they are rating. */
  vendorName?: string | null;
  /** Saves the tapped rating immediately. */
  onRate: (rating: number) => void;
  isSaving?: boolean;
  justSaved?: boolean;
  /** Opens the composer for the optional headline and words. */
  onAddWords?: () => void;
  /** A refused write, already a sentence. */
  error?: string | null;
  /**
   * Where the `event_not_started` case sends the client — the booking that
   * would unlock the rating. Rendered as whatever element the app passes, so
   * this kit stays free of a router dependency.
   */
  bookingLink?: (bookingId: string, label: string) => React.ReactNode;
};

/**
 * The client's own standing with this vendor, as a bar above the reviews — or
 * as nothing at all, which is the point.
 *
 * WHAT THIS REPLACED. A panel that printed a heading and a two-to-three
 * sentence paragraph for all six eligibility states, including for a visitor
 * who had never booked the vendor and had come only to read the reviews. The
 * explanations were accurate and nobody read them: clients reported the review
 * screens as too much reading and stopped before the first review, which sat
 * underneath. The rules have not changed — the server still decides all of
 * this — only how much of it is said unprompted.
 *
 * WHO SEES WHAT NOW:
 *   eligible          the stars themselves, which save on the tap. The control
 *                     is the message, so there is no paragraph inviting the
 *                     client to go and find a control
 *   waiting           one short line, and — for the one state with somewhere to
 *                     go — a link to the booking that unlocks the rating
 *   already reviewed  nothing. Their review is the first row of the list below,
 *                     marked "Your rating" and carrying the Change button, so a
 *                     panel here would be the same review printed twice
 *   never booked      nothing. They came to read the reviews; a notice about a
 *                     rule they did not ask about belongs nowhere above them
 *
 * `reviewEligibility` still holds copy for every state, so a surface that does
 * want to state all six can.
 */
export function ReviewPromptBar({
  state,
  vendorName,
  onRate,
  isSaving = false,
  justSaved = false,
  onAddWords,
  error,
  bookingLink,
}: ReviewPromptBarProps) {
  // A signed-out visitor has no state to report, and the reviews are below
  // either way — so silence here is correct rather than a gap.
  if (!state) return null;

  const copy = reviewEligibility(state.reason);

  // A tap flips the state from `eligible` to `already_reviewed` as soon as the
  // read refreshes, which would take this bar away under the thumb that just
  // used it — carrying off both the confirmation and the offer to add words.
  // So a rating saved in this session keeps the row, until the page is left.
  const heldOpen = justSaved && copy.tone === 'done' && !state.is_locked;

  // The two silent cases, for the two different reasons given above.
  if (!heldOpen && (copy.tone === 'none' || copy.tone === 'done')) return null;

  if (copy.tone === 'invite' || heldOpen) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          borderColor: 'secondary.main',
          bgcolor: 'action.hover',
        }}
      >
        <StarRateRow
          value={state.rating}
          prompt={vendorName ? `How was ${vendorName}?` : 'How was this vendor?'}
          onRate={onRate}
          isSaving={isSaving}
          justSaved={justSaved}
          onAddWords={onAddWords}
          addWordsLabel={state.review_body ? 'Change your words' : 'Add a few words'}
          error={error}
        />
      </Paper>
    );
  }

  // Waiting: one line, no card. A rule the client cannot act on yet should not
  // be given the weight of a panel above the thing they came to read.
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
      <LockClockIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
      <Typography variant="body2" color="text.secondary">
        {copy.title}
        {copy.description ? `. ${copy.description}` : ''}
      </Typography>
      {state.reason === 'event_not_started' &&
        state.booking_id &&
        bookingLink?.(state.booking_id, copy.ctaLabel ?? 'Open booking')}
    </Stack>
  );
}
