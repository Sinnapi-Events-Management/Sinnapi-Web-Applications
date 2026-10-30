'use client';
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import {
  REVIEW_BODY_MAX,
  REVIEW_TITLE_MAX,
  checkReviewDraft,
  ratingLabel,
} from '../schema/reviewRules';
import type { ReviewDraft } from '../types';

export type ReviewComposerDialogProps = {
  open: boolean;
  /** Named in the heading, so the client knows who they are rating. */
  vendorName: string | null | undefined;
  /** The booking being rated, quoted so there is no doubt which one it is. */
  bookingReference?: string | null;
  /** Prefilled when editing an existing review; omitted when writing a new one. */
  initial?: Partial<ReviewDraft> | null;
  /**
   * Whether this is an edit. Only changes the wording — the caller decides
   * which RPC runs, because create and update are different writes.
   */
  mode: 'create' | 'edit';
  isBusy: boolean;
  error: string | null;
  onSubmit: (draft: ReviewDraft) => void | Promise<void>;
  onClose: () => void;
};

/**
 * The composer: the words, for the clients who have words.
 *
 * NO LONGER THE WAY IN. Rating a vendor is a tap on a star now — on the
 * booking's action bar, on the vendor's Reviews tab, on the Reviews page — and
 * that tap saves by itself. This dialog is what opens behind "Add a few words",
 * once a rating already exists, and for the client changing one. Most clients
 * will never see it, which is the intent: the screens that used to open with
 * two empty text fields are why rating felt like paperwork.
 *
 * ONE DIALOG, EVERY ENTRY POINT. The booking page, the vendor profile and the
 * Reviews page all open this one. A second composer written for any of them
 * would be a second set of length caps and a second idea of what is required.
 *
 * THE RATING IS THE REQUIRED PART AND THE WRITE-UP IS NOT. A bare score from a
 * verified booking is a useful signal, and making the prose mandatory is how a
 * marketplace collects three reviews instead of three hundred. Both fields say
 * "not required" under them rather than leaving the client to find out by
 * trying to submit.
 *
 * WHAT IT SAYS BEFORE IT SAVES. One line: the review is public, and it can be
 * changed until the vendor replies. It used to be a three-clause paragraph
 * about escrow and finality in an info box — accurate, and skipped. The lock
 * itself is explained where it bites, on the row that can no longer be edited.
 */
export function ReviewComposerDialog({
  open,
  vendorName,
  bookingReference,
  initial,
  mode,
  isBusy,
  error,
  onSubmit,
  onClose,
}: ReviewComposerDialogProps) {
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  // Nothing is marked wrong until the client has tried to submit. A form that
  // turns red before it has been used reads as a form that is already failing.
  const [attempted, setAttempted] = useState(false);

  // Reset to the row being edited each time the dialog opens. Without this the
  // second booking a client rates in one sitting opens holding the first one's
  // words, and they would be submitted against the wrong vendor.
  useEffect(() => {
    if (!open) return;
    setRating(initial?.rating ?? null);
    setTitle(initial?.title ?? '');
    setBody(initial?.body ?? '');
    setAttempted(false);
  }, [open, initial?.rating, initial?.title, initial?.body]);

  const check = checkReviewDraft({ rating: rating ?? 0, title, body });
  const titleOver = title.trim().length > REVIEW_TITLE_MAX;
  const bodyOver = body.trim().length > REVIEW_BODY_MAX;

  async function submit() {
    setAttempted(true);
    if (!check.isValid || rating == null) return;
    await onSubmit({ rating, title: title.trim(), body: body.trim() });
  }

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'edit' ? 'Your rating' : `Rate ${vendorName ?? 'this vendor'}`}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {bookingReference && (
            <Typography variant="body2" color="text.secondary">
              Booking {bookingReference}
            </Typography>
          )}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {vendorName ? `How was ${vendorName}?` : 'How was it?'}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Rating
                value={rating}
                max={5}
                size="large"
                disabled={isBusy}
                onChange={(_, next) => setRating(next)}
                icon={<StarRoundedIcon fontSize="inherit" />}
                emptyIcon={<StarOutlineRoundedIcon fontSize="inherit" />}
                // Matched to the tap-to-rate row this dialog is usually opened
                // from, so the stars do not shrink between the two.
                sx={{ fontSize: { xs: '2.25rem', sm: '2.5rem' } }}
              />
              {/* The named step, which is what stops a five-star row being read
                  as "how do you feel". Reserves its line either way so the
                  dialog does not jump as the client moves the control. */}
              <Typography
                variant="body2"
                color={rating ? 'text.primary' : 'text.secondary'}
                sx={{ minHeight: 20 }}
              >
                {rating ? ratingLabel(rating) : 'Tap a star'}
              </Typography>
            </Stack>
            {attempted && rating == null && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                Tap a star first.
              </Typography>
            )}
          </Box>

          {/* Both fields say "Not required" until they are used, and only then
              start counting. A character counter under an empty optional field
              is a limit announced before anyone is near it. */}
          <TextField
            label="Headline"
            placeholder="One line, if you want"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isBusy}
            fullWidth
            error={titleOver}
            helperText={
              titleOver
                ? `${title.trim().length - REVIEW_TITLE_MAX} letters too long`
                : title.length > 0
                  ? `${title.trim().length}/${REVIEW_TITLE_MAX}`
                  : 'Not required'
            }
          />

          <TextField
            label="Your words"
            placeholder="What was good? What was not?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isBusy}
            fullWidth
            multiline
            minRows={3}
            error={bodyOver}
            helperText={
              bodyOver
                ? `${body.trim().length - REVIEW_BODY_MAX} letters too long`
                : body.length > 0
                  ? `${body.trim().length}/${REVIEW_BODY_MAX}`
                  : 'Not required — the stars are enough'
            }
          />

          <Typography variant="caption" color="text.secondary">
            Everyone can see this. You can change it until the vendor replies.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<StarRoundedIcon />}
          // Disabled on length only. An empty rating is caught on submit so the
          // client is told what is missing rather than left with a dead button.
          disabled={isBusy || titleOver || bodyOver}
          onClick={submit}
        >
          {isBusy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
