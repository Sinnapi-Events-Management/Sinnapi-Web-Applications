import { useCallback, useMemo, useState } from 'react';
import { reviewError, type ReviewDraft, type ReviewQueueRow } from '@sinnapi/ui/reviews';
import { useReviewQueue, useSaveReview } from '@/hooks/queries';

/**
 * The Reviews page: what the client still owes, what they have said, and the
 * one tap that writes either.
 *
 * The split is derived here rather than fetched twice. `get_my_review_queue`
 * returns every booking the client may review in one read, and `review_id`
 * decides which half a row belongs to — so submitting a review moves a row from
 * one list to the other on a single invalidation, and the "awaiting" count can
 * never disagree with the rows under it.
 *
 * THE TAP IS THE WRITE, SO THE ROW MUST NOT RUN AWAY FROM IT. `rate` saves a
 * bare rating the moment a star is tapped, which sets `review_id` and would
 * move the row out of the outstanding list and down the page — out from under
 * the thumb that just tapped it, before the client has read the confirmation.
 * `saved` holds the rows rated in this session in place until the page is left.
 * The outstanding count ignores them, because they are no longer outstanding.
 *
 * Per-row busy and error state rather than the mutation's own: the page shows
 * several rateable bookings at once, and `save.isPending` would put every row
 * on the page into "Saving…" because one of them was.
 *
 * The composer is driven by the row it was opened from, not by a copy of its
 * fields. `editing` holds the whole row, which is what lets the dialog know the
 * vendor's name, the booking reference, whether this is a create or an edit, and
 * whether the vendor has already replied — four things that would otherwise be
 * four more pieces of state to keep in step.
 */
export function useReviews() {
  const { data, isLoading, error } = useReviewQueue();
  const save = useSaveReview();
  const [editing, setEditing] = useState<ReviewQueueRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [rowError, setRowError] = useState<{ bookingId: string; message: string } | null>(null);

  // Keyed on `data` and `saved`, not on a `data ?? []` local: the fallback is a
  // fresh array on every render, so a memo depending on it would recompute
  // every time and hand both lists new identities — which re-renders every card
  // in them.
  const { rows, awaiting, written, outstanding } = useMemo(() => {
    const all = data ?? [];
    const held = (row: ReviewQueueRow) => saved.includes(row.booking_id);
    return {
      rows: all,
      awaiting: all.filter((r) => !r.review_id || held(r)),
      written: all.filter((r) => r.review_id && !held(r)),
      /** Genuinely unrated, for the count in the heading. */
      outstanding: all.filter((r) => !r.review_id).length,
    };
  }, [data, saved]);

  const open = useCallback(
    (row: ReviewQueueRow) => {
      save.reset();
      setRowError(null);
      setEditing(row);
    },
    [save],
  );

  const close = useCallback(() => {
    save.reset();
    setEditing(null);
  }, [save]);

  const write = useCallback(
    async (row: ReviewQueueRow, draft: ReviewDraft) => {
      try {
        await save.mutateAsync({
          ...draft,
          reviewId: row.review_id,
          bookingId: row.booking_id,
        });
        return true;
      } catch (e) {
        setRowError({ bookingId: row.booking_id, message: reviewError(e) });
        return false;
      }
    },
    [save],
  );

  const rate = useCallback(
    async (row: ReviewQueueRow, rating: number) => {
      setBusyId(row.booking_id);
      setRowError(null);
      // The headline and words already on the review go back unchanged:
      // `update_review` writes all three columns every time, so omitting them
      // would erase what the client wrote the moment they fixed their star.
      const ok = await write(row, {
        rating,
        title: row.review_title ?? '',
        body: row.review_body ?? '',
      });
      setBusyId(null);
      if (ok)
        setSaved((prev) => (prev.includes(row.booking_id) ? prev : [...prev, row.booking_id]));
    },
    [write],
  );

  const submit = useCallback(
    async (draft: ReviewDraft) => {
      if (!editing) return;
      if (await write(editing, draft)) setEditing(null);
      // On a failure the dialog stays open, holding the client's words, with
      // the reason in `saveError`.
    },
    [editing, write],
  );

  return {
    rows,
    awaiting,
    written,
    outstanding,
    isLoading,
    error,

    /** The row the composer is open for, or `null` when it is closed. */
    editing,
    open,
    close,
    rate,
    submit,

    /** Per row, so one saving card does not put every card into "Saving…". */
    busyId,
    /** Rated in this session — the row shows its confirmation and stays put. */
    saved,
    rowError,

    isSaving: save.isPending,
    saveError: save.error ? reviewError(save.error) : null,
  };
}
