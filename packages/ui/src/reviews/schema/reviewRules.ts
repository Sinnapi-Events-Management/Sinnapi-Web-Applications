/**
 * The review rules, as data. Pure (no React, no MUI), shared by every app —
 * the same reason `bookingTransitions` lives beside it.
 *
 * Everything here mirrors `20261026000001_review_unlock_and_integrity.sql`
 * deliberately: the length caps are the same numbers `create_review` raises on,
 * the eligibility reasons are the tokens `get_my_vendor_review_state` returns,
 * and the error table maps every guard those RPCs can raise. The server is the
 * enforcement; this is the UI declining to offer a write the server would
 * refuse, and — more importantly here — explaining *why*, which is the part the
 * product has never done.
 *
 * WHY THE EXPLANATIONS ARE THE POINT
 * The old flow had one gate (`booking.status = 'completed'`) and no copy for
 * it, so a client who could not review simply found a button that wasn't there.
 * The vendor profile is where clients go to review — that is the complaint this
 * work exists to answer — so every visitor to that tab needs a sentence, not
 * just the eligible one. `reviewEligibility` returns copy for all six states.
 *
 * WHY EVERY SENTENCE HERE IS SHORT
 * Most of the people reading it are rating a vendor on a phone, in English they
 * read slowly or not at all. The copy in this file used to be two and three
 * sentences per state, explaining escrow conditions and moderation policy to a
 * person who wanted to give someone four stars; clients reported the review
 * screens as "too much reading" and stopped at the top of them. Each string is
 * now one short line of plain words — the rule it states is unchanged, and the
 * place that enforces it is still the server.
 */

import { rpcErrorMessage } from '../../molecules/rpcError';
import type { ReviewEligibilityReason } from '../types';

/** `reviews.rating` is `check (rating between 1 and 5)`. */
export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;

/**
 * The booking statuses whose client may review — `review_eligible_statuses()`
 * on the server, which the insert policy and all three RPCs read.
 *
 * `in_progress` is the one that matters and the one that was missing. Reviewing
 * used to require `completed`, and `completed` is reachable only through
 * `complete_booking`, which admits the vendor and an admin but never the
 * client — so the client's permission to speak about a job was issued by the
 * counterparty the review is about, and a vendor who never pressed "Mark
 * completed" silenced the client for good. Starting the event is the client's
 * own act, so it is the gate.
 */
export const REVIEW_ELIGIBLE_BOOKING_STATUSES = ['in_progress', 'completed'] as const;

export function isBookingReviewable(status: string | null | undefined): boolean {
  return REVIEW_ELIGIBLE_BOOKING_STATUSES.includes(
    (status ?? '') as (typeof REVIEW_ELIGIBLE_BOOKING_STATUSES)[number],
  );
}

export type BookingReviewGate = {
  /** A new review may be written for this booking. */
  canReview: boolean;
  /** An existing review may still be changed. */
  canEdit: boolean;
  /**
   * Why neither is on offer, phrased for the client. `null` when something is.
   * Always a sentence rather than a bare `false`, for the same reason
   * `evaluateBookingStartGate` returns copy: a client looking at a booking that
   * refuses to let them rate it is owed the reason.
   */
  blockedReason: string | null;
};

/**
 * Whether a client may rate this booking, and if not, why.
 *
 * Mirrors the server's gate so the booking page can decline in advance instead
 * of offering a button that would be refused — and, more to the point here, so
 * it can say what would change the answer. The old page simply omitted the
 * button, which is why clients went looking for the control on the vendor's
 * profile instead.
 */
export function evaluateBookingReviewGate(input: {
  /** `bookings.status`. */
  status: string | null | undefined;
  /** Whether a review already exists for this booking. */
  hasReview: boolean;
  /** `reviews.status` of that review, when there is one. */
  reviewStatus?: string | null;
  /** Whether the vendor has replied to it. */
  isLocked?: boolean;
}): BookingReviewGate {
  const { status, hasReview, reviewStatus, isLocked = false } = input;

  if (!isBookingReviewable(status)) {
    return {
      canReview: false,
      canEdit: false,
      blockedReason:
        status === 'requested'
          ? 'You can rate after the vendor accepts and your event starts.'
          : status === 'confirmed'
            ? 'You can rate once you start the event.'
            : 'This booking cannot be rated.',
    };
  }

  if (!hasReview) return { canReview: true, canEdit: false, blockedReason: null };

  const editable = canEditReview({ status: reviewStatus, isLocked });
  return {
    canReview: false,
    canEdit: editable,
    blockedReason: editable ? null : editBlockedReason({ status: reviewStatus, isLocked }),
  };
}

/** The caps `create_review` and `update_review` raise on. */
export const REVIEW_TITLE_MAX = 120;
export const REVIEW_BODY_MAX = 2000;

/**
 * What each star means, shown beside the stars as the client taps along them.
 *
 * A bare five-star row is read as "how did you feel", which is how a vendor who
 * was merely adequate collects a profile full of fives. Naming the steps makes
 * the scale mean something, and it is the only way a client can tell whether a
 * 3 is neutral or bad on our scale.
 *
 * Two words at most. These are read in the half-second between tapping a star
 * and lifting the thumb, under the stars themselves on a narrow screen — the
 * sentence-long versions ("Poor — it went wrong and was not put right") wrapped
 * onto three lines there and moved the control the client was still touching.
 * One word per step also survives translation, which sentences with dashes in
 * them do not.
 */
export const RATING_LABELS: Record<number, string> = {
  1: 'Very bad',
  2: 'Not good',
  3: 'Okay',
  4: 'Good',
  5: 'Very good',
};

/**
 * The same words again, kept as a separate map so a chip or a list row can be
 * reworded without touching the live control's labels.
 */
export const RATING_SHORT_LABELS: Record<number, string> = {
  1: 'Very bad',
  2: 'Not good',
  3: 'Okay',
  4: 'Good',
  5: 'Very good',
};

export function ratingLabel(rating: number | null | undefined): string {
  if (!rating) return 'Not rated';
  return RATING_LABELS[rating] ?? `${rating} out of 5`;
}

export function ratingShortLabel(rating: number | null | undefined): string {
  if (!rating) return 'Not rated';
  return RATING_SHORT_LABELS[rating] ?? `${rating} / 5`;
}

/**
 * Whether a draft may be submitted, and the first thing wrong with it.
 *
 * A rating alone is a valid review: making the write-up mandatory is how a
 * marketplace ends up with three reviews instead of three hundred, and a bare
 * score from a verified booking is still a useful signal. The body is invited,
 * not required.
 */
export type ReviewDraftCheck = {
  isValid: boolean;
  /** The first problem, for a helper line. `null` when the draft is fine. */
  problem: string | null;
};

export function checkReviewDraft(draft: {
  rating: number;
  title?: string | null;
  body?: string | null;
}): ReviewDraftCheck {
  const title = (draft.title ?? '').trim();
  const body = (draft.body ?? '').trim();

  if (!draft.rating || draft.rating < REVIEW_MIN_RATING || draft.rating > REVIEW_MAX_RATING) {
    return { isValid: false, problem: 'Tap a star first.' };
  }
  if (title.length > REVIEW_TITLE_MAX) {
    return {
      isValid: false,
      problem: `The headline is ${title.length - REVIEW_TITLE_MAX} letters too long.`,
    };
  }
  if (body.length > REVIEW_BODY_MAX) {
    return {
      isValid: false,
      problem: `Your words are ${body.length - REVIEW_BODY_MAX} letters too long.`,
    };
  }
  return { isValid: true, problem: null };
}

/**
 * Whether the author may still change a review.
 *
 * The window closes when the vendor replies — a reply answers the text beside
 * it, and a review rewritten afterwards leaves the vendor publicly responding
 * to words that are no longer there. `review_is_locked` on the server is the
 * same rule, derived from the same reply.
 *
 * A review moderation has touched is nobody's to edit either, which is why
 * `status` is read and not assumed.
 */
export function canEditReview(input: {
  /** `reviews.status` — only `published` is the author's. */
  status: string | null | undefined;
  isLocked: boolean;
}): boolean {
  return input.status === 'published' && !input.isLocked;
}

/** Why a review can no longer be edited, for the line under a disabled control. */
export function editBlockedReason(input: {
  status: string | null | undefined;
  isLocked: boolean;
}): string | null {
  if (canEditReview(input)) return null;
  if (input.status && input.status !== 'published') {
    return 'This rating was taken down. Contact us if that is wrong.';
  }
  return 'The vendor replied, so your rating is final now.';
}

/**
 * The eligibility state, as something a page can render.
 *
 * One entry per token `get_my_vendor_review_state` can return. `title` is the
 * one line the prompt bar shows, `description` is the extra line it shows only
 * where there is something for the client to go and do, and `tone` decides
 * whether the bar appears at all — see `ReviewPromptBar`.
 */
export type ReviewEligibilityCopy = {
  /** The whole message, usually. One short line, no full stop needed. */
  title: string;
  /**
   * A second short line, or `null`. Present only for the states where knowing
   * the rule changes what the client does next; a state they can do nothing
   * about gets the title alone rather than a paragraph explaining our rules.
   */
  description: string | null;
  /** Primary button label, or `null` when there is nothing to offer. */
  ctaLabel: string | null;
  tone: 'invite' | 'waiting' | 'done' | 'none';
};

const ELIGIBILITY: Record<ReviewEligibilityReason, ReviewEligibilityCopy> = {
  eligible: {
    title: 'Tap a star to rate this vendor',
    description: null,
    ctaLabel: 'Rate this vendor',
    tone: 'invite',
  },
  already_reviewed: {
    // The rating itself is shown back to the client wherever this appears, so
    // the line does not repeat it. What it adds is the one thing they cannot
    // see: that the rating can still be changed.
    title: 'You rated this vendor',
    description: 'You can change it until they reply',
    ctaLabel: 'Change',
    tone: 'done',
  },
  already_reviewed_locked: {
    title: 'You rated this vendor',
    description: 'The vendor replied, so it is final now',
    ctaLabel: null,
    tone: 'done',
  },
  booking_not_confirmed: {
    title: 'You can rate after the vendor accepts your booking',
    description: null,
    ctaLabel: null,
    tone: 'waiting',
  },
  event_not_started: {
    // The only state with somewhere to go: the button that unlocks the rating
    // is on the booking, so the line names it in the same words the booking
    // page prints on that button.
    title: 'You can rate once your event starts',
    description: 'Open your booking and tap Start event',
    ctaLabel: 'Open booking',
    tone: 'waiting',
  },
  no_booking: {
    // Shown nowhere by default. A visitor who never booked this vendor came to
    // read the reviews, and a notice telling them they may not write one is a
    // rule they did not ask about, printed above the thing they came for.
    title: 'Only clients who booked can rate',
    description: null,
    ctaLabel: null,
    tone: 'none',
  },
};

export function reviewEligibility(
  reason: ReviewEligibilityReason | string | null | undefined,
): ReviewEligibilityCopy {
  return ELIGIBILITY[(reason ?? 'no_booking') as ReviewEligibilityReason] ?? ELIGIBILITY.no_booking;
}

/** `create_review`, `update_review` and `respond_to_review` refusals, in plain language. */
const REVIEW_ERRORS: Record<string, string> = {
  booking_not_reviewable: 'You can rate this once your event starts.',
  review_already_exists: 'You already rated this booking. Change that rating instead.',
  rating_out_of_range: 'Tap a star from 1 to 5.',
  review_title_too_long: `Keep the headline under ${REVIEW_TITLE_MAX} letters.`,
  review_body_too_long: `Keep your words under ${REVIEW_BODY_MAX} letters.`,
  review_locked_by_reply: 'The vendor replied, so this rating is final now.',
  review_not_editable: 'This rating was taken down, so it cannot be changed.',
  review_identity_immutable: 'A rating cannot be moved to another vendor or booking.',
  review_status_not_yours: 'Only our team can take a rating down or put it back.',
  review_not_answerable: 'This rating was taken down, so it cannot be answered.',
  reply_required: 'Write your reply first.',
  reply_too_long: `Keep the reply under ${REVIEW_BODY_MAX} letters.`,
  not_found: 'This rating no longer exists.',
  forbidden: 'You cannot change this rating.',
};

/**
 * A failed review write as a sentence. Same reader as the booking and quotation
 * sides — see `rpcError.ts` for why a Supabase failure cannot be read with
 * `instanceof Error`.
 */
export function reviewError(error: unknown): string {
  return rpcErrorMessage(error, REVIEW_ERRORS);
}
