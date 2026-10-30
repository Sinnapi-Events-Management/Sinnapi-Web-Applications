import { useCallback, useMemo, useState } from 'react';
import {
  evaluateBookingReviewGate,
  isBookingReviewable,
  reviewError,
  type ReviewDraft,
  type ReviewQueueRow,
} from '@sinnapi/ui/reviews';
import { useReviewQueue, useSaveReview } from '@/hooks/queries';

/**
 * The review on this booking: whether it can be left, what it says if it
 * exists, and the single tap that writes it.
 *
 * READ THROUGH THE QUEUE, NOT A PER-BOOKING QUERY. `get_my_review_queue`
 * returns every booking this client may review, so the row for this booking is
 * already in it — and the Reviews page shares the same key, which makes this a
 * cache hit for anyone who arrived from there. A second RPC returning one row
 * of the same shape would be a second thing to keep in step with the first.
 *
 * The queue only contains *eligible* bookings, so its absence is not an answer
 * on its own: a booking still awaiting confirmation is missing from it for the
 * same reason a cancelled one is. The gate is therefore evaluated from the
 * booking's own status, which the page already has, and the queue row supplies
 * only what a review adds on top.
 *
 * THE TAP IS THE WRITE. `rate` saves a bare rating with no dialog in between:
 * `create_review` blanks an absent title and body, so a rating on its own is a
 * complete review, and a later tap on a different star goes to `update_review`
 * through the same path. The composer is the optional second step for the
 * clients who have words, which is why `open` stayed separate.
 */
export function useBookingReview(input: {
  bookingId: string | undefined;
  status: string | null | undefined;
  vendorName: string | null | undefined;
  reference: string | null | undefined;
}) {
  const { bookingId, status, vendorName, reference } = input;
  const { data } = useReviewQueue();
  const save = useSaveReview();
  const [isOpen, setOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const row: ReviewQueueRow | null = useMemo(
    () => (data ?? []).find((r) => r.booking_id === bookingId) ?? null,
    [data, bookingId],
  );

  const gate = useMemo(
    () =>
      evaluateBookingReviewGate({
        status,
        hasReview: Boolean(row?.review_id),
        reviewStatus: row?.review_status ?? null,
        isLocked: row?.is_locked ?? false,
      }),
    [status, row?.review_id, row?.review_status, row?.is_locked],
  );

  const open = useCallback(() => {
    save.reset();
    setOpen(true);
  }, [save]);

  const close = useCallback(() => {
    save.reset();
    setOpen(false);
  }, [save]);

  const write = useCallback(
    async (draft: ReviewDraft) => {
      if (!bookingId) return false;
      try {
        await save.mutateAsync({
          ...draft,
          reviewId: row?.review_id ?? null,
          bookingId,
        });
        return true;
      } catch {
        // Kept in `save.error`. The dialog stays open on a failure so a bad
        // write does not discard what the client typed.
        return false;
      }
    },
    [bookingId, row?.review_id, save],
  );

  const rate = useCallback(
    async (rating: number) => {
      // The headline and words already on the review are sent back unchanged.
      // `update_review` writes all three columns every time, so leaving them
      // out would erase what the client wrote the moment they fixed their star.
      const ok = await write({
        rating,
        title: row?.review_title ?? '',
        body: row?.review_body ?? '',
      });
      if (ok) setJustSaved(true);
    },
    [write, row?.review_title, row?.review_body],
  );

  const submit = useCallback(
    async (draft: ReviewDraft) => {
      if (await write(draft)) setOpen(false);
    },
    [write],
  );

  return {
    /** The existing review, or `null` when none has been written. */
    review: row,
    canReview: gate.canReview,
    canEdit: gate.canEdit,
    blockedReason: gate.blockedReason,

    /**
     * Whether the stars belong on screen at all — the booking has reached a
     * state where rating is the client's business. A booking still waiting on
     * the vendor gets no star row: it would be a disabled control explaining a
     * rule nobody asked about, in the one panel the client uses to act.
     */
    isRateable: isBookingReviewable(status),
    /** The rating as saved, for the stars to open on. */
    rating: row?.rating ?? null,
    hasWords: Boolean(row?.review_body),

    /**
     * The vendor's answer, which the queue has been returning all along.
     *
     * The booking used to tell the client their rating was final because the
     * vendor had replied, and then show them none of the reply — so the one
     * person the answer was written for had to go to the vendor's public
     * profile to read it. `get_my_review_queue` carries `reply_body` and
     * `reply_at` on the row, so this was never a missing read.
     */
    reply: row?.reply_body ?? null,
    replyAt: row?.reply_at ?? null,
    vendorAvatar: row?.vendor_image_url ?? null,

    isOpen,
    open,
    close,
    rate,
    submit,
    isSaving: save.isPending,
    justSaved,
    saveError: save.error ? reviewError(save.error) : null,

    /** Passed straight to the shared composer. */
    vendorName: row?.vendor_name ?? vendorName ?? null,
    reference: row?.reference_no ?? reference ?? null,
  };
}
