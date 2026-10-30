import { useCallback, useMemo, useState } from 'react';
import {
  canEditReview,
  reviewError,
  type ReviewDraft,
  type VendorReview,
} from '@sinnapi/ui/reviews';
import { useMyVendorReviewState, useSaveReview, useVendorReviews } from '@/hooks/queries';

/**
 * Whether the client's own review is still on the profile.
 *
 * `review_status` is absent on the older shape of `get_my_vendor_review_state`,
 * which returned the review without saying whether moderation had published it.
 * Treating that absence as published is exactly what the callers assumed before
 * the column existed, so an un-migrated environment behaves as it did.
 */
function isPublished(state: { review_status?: string | null } | null | undefined): boolean {
  return (state?.review_status ?? 'published') === 'published';
}

/**
 * The vendor profile's Reviews tab: what other clients said, this client's own
 * rating among them, and the one tap that leaves it.
 *
 * WHY THIS HOOK EXISTS AT ALL. Clients look for the rating control on the
 * vendor's profile — that is the complaint this work answers — and the tab they
 * found showed a score, a sentence saying written reviews were not displayed,
 * and no way in. Both halves of that were consequences of missing reads rather
 * than decisions: there was no per-vendor review query (`profiles_self_read`
 * means a client cannot resolve another client's name through PostgREST, so the
 * authors were unresolvable), and no eligibility read to gate a button on.
 *
 * Three reads, each answering a different question:
 *   useVendorReviews        what every client said — paged, public, anonymous
 *                           enough to be printable (first name + last initial)
 *   useMyVendorReviewState  whether THIS client may rate THIS vendor, and the
 *                           booking that decides it. Always one row, including
 *                           for a visitor who has never booked
 *   useSaveReview           the write, shared with the booking page and the
 *                           Reviews page so one composer serves all three
 *
 * THE TAP IS THE WRITE. `rate` saves a bare rating on the star tap, with no
 * dialog in between — `create_review` blanks an absent title and body, so a
 * rating on its own is a complete review, and tapping a different star later
 * calls `update_review` through the same path. The composer is now only for the
 * clients who want to add words, which is why `open` is a separate action.
 */
export function useVendorReviewsTab(vendorId: string | undefined) {
  const list = useVendorReviews(vendorId);
  const { data: state } = useMyVendorReviewState(vendorId);
  const save = useSaveReview();
  const [isOpen, setOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Flattened here rather than in the component: an infinite query's pages are
  // a fetching detail, and the list below only ever renders one sequence.
  const reviews = useMemo(() => (list.data?.pages ?? []).flat(), [list.data]);

  const open = useCallback(() => {
    save.reset();
    setOpen(true);
  }, [save]);

  const close = useCallback(() => {
    save.reset();
    setOpen(false);
  }, [save]);

  /**
   * The write every entry point on this tab goes through. `reviewId` decides
   * create from update, exactly as the shared mutation expects, and the booking
   * is the server's business rather than the client's choice: the eligibility
   * read already picked the one this rating belongs to, which is why nothing
   * here ever asks.
   */
  const write = useCallback(
    async (draft: ReviewDraft) => {
      if (!state?.booking_id && !state?.review_id) return false;
      try {
        await save.mutateAsync({
          ...draft,
          reviewId: state?.review_id ?? null,
          bookingId: state?.booking_id ?? null,
        });
        return true;
      } catch {
        // Held in `save.error`. The caller decides what stays open — the dialog
        // does, so the client's words are not thrown away by a failed write.
        return false;
      }
    },
    [state?.booking_id, state?.review_id, save],
  );

  const rate = useCallback(
    async (rating: number) => {
      // The existing headline and words are sent back unchanged. `update_review`
      // writes all three columns every time, so omitting them here would erase
      // what the client wrote the moment they corrected their star.
      const ok = await write({
        rating,
        title: state?.review_title ?? '',
        body: state?.review_body ?? '',
      });
      if (ok) setJustSaved(true);
    },
    [write, state?.review_title, state?.review_body],
  );

  const submit = useCallback(
    async (draft: ReviewDraft) => {
      if (await write(draft)) setOpen(false);
    },
    [write],
  );

  /**
   * The client's own review, as a list row.
   *
   * `get_vendor_reviews` is newest-first and paged ten at a time, so on a busy
   * vendor the client's own review — and the button to change it — could be
   * four pages down. This is the same row built from the eligibility read,
   * which always returns it, and `ReviewList` drops it once the real one
   * arrives in a page. No `created_at`: that read does not carry one, and an
   * invented date on the client's own review is worse than no date.
   */
  // Read outside the memo so the memo depends on the answer rather than on the
  // whole state object, which changes identity on every refetch.
  const minePublished = isPublished(state);

  const myReview: VendorReview | null = useMemo(() => {
    // Only a published review is on the profile, and this row is pinned into
    // the profile's own list — so a review moderation has taken down is not
    // shown back as though it were still there.
    if (!state?.review_id || !minePublished) return null;
    return {
      review_id: state.review_id,
      rating: state.rating ?? 0,
      title: state.review_title,
      body: state.review_body,
      created_at: '',
      edited_at: null,
      author_name: null,
      author_avatar: null,
      reply_body: null,
      reply_at: null,
      total_count: 0,
    };
  }, [state?.review_id, state?.rating, state?.review_title, state?.review_body, minePublished]);

  return {
    reviews,
    isLoading: list.isLoading,
    error: list.error,
    loadMore: list.hasNextPage ? () => void list.fetchNextPage() : undefined,
    isLoadingMore: list.isFetchingNextPage,

    /** `null` for a signed-out visitor, who gets the list and no prompt. */
    state: state ?? null,
    myReview,
    myReviewId: state?.review_id && minePublished ? state.review_id : null,
    canEditMine: canEditReview({
      status: state?.review_id ? (state.review_status ?? 'published') : null,
      isLocked: state?.is_locked ?? false,
    }),

    isOpen,
    open,
    close,
    rate,
    submit,
    isSaving: save.isPending,
    justSaved,
    saveError: save.error ? reviewError(save.error) : null,
  };
}
