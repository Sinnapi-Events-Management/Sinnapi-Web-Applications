import { Link as RouterLink } from 'react-router-dom';
import { BookingActionDialog, Box, Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import {
  RatingValue,
  ReviewComposerDialog,
  StarRateRow,
  VendorReplyNote,
} from '@sinnapi/ui/reviews';
import BoltIcon from '@mui/icons-material/Bolt';
import ChatIcon from '@mui/icons-material/Chat';
import { FEATURES } from '@sinnapi/utils/constants';
import type { BookingDetailModel } from '@/lib/types';
import { useBookingActions } from '../../hooks/useBookingActions';
import { useBookingReview } from '../../hooks/useBookingReview';
import BookingStartPanel from '../molecules/BookingStartPanel';

type Props = {
  booking: BookingDetailModel;
  /** Named in the rating prompt, so the client knows who they are rating. */
  vendorName: string | null | undefined;
};

/**
 * What the client can do about this booking right now: start the event, and —
 * once it has started — rate the vendor.
 *
 * Pinned above the tabs rather than filed inside one of them. Marking an event
 * under way is time-critical — a client does it on the morning of the event,
 * usually on a phone — and it should not be a tab away.
 *
 * WHY THE RATING MOVED HERE. It used to live in "Next steps", inside the
 * Progress tab: a client who had just finished their event had to know that
 * rating a vendor was a kind of progress, press a tab, and scroll. Clients did
 * not find it, and told us so. It is the other thing a booking asks of them, so
 * it sits in the other thing this page does. Five stars, tapped once, saved on
 * the tap — see `StarRateRow` for why there is no dialog in the way.
 *
 * WHY IT IS ABOVE THE START PANEL. The stars only appear once the event is
 * under way or complete, and at that point starting the event is a note about
 * something already done while the rating is the live request. For every
 * earlier status the stars are absent and this is the start panel alone, as
 * before.
 *
 * Layout only — `useBookingActions` owns the status write, `useBookingReview`
 * owns the rating, `BookingActionDialog` and `ReviewComposerDialog` own their
 * modals.
 */
export default function BookingActionBar({ booking, vendorName }: Props) {
  const actions = useBookingActions(booking);
  const review = useBookingReview({
    bookingId: booking.id,
    status: booking.status,
    vendorName,
    reference: booking.reference_no,
  });

  // Tappable while the booking is rateable and the window is open — which
  // covers both the first rating and a change to it, because both are the same
  // gesture and the same write.
  const canTapStars = review.isRateable && (review.canReview || review.canEdit);
  // Rated, and the vendor has replied. The stars stay on screen read-only: a
  // rating that disappears once it is final looks like a rating that was lost.
  const isFinal = review.isRateable && Boolean(review.review?.review_id) && !review.canEdit;
  const hasReview = Boolean(review.review?.review_id);

  return (
    <SectionCard
      title={
        actions.isUnderway
          ? 'In progress'
          : actions.hasActions || canTapStars || isFinal
            ? 'Your event'
            : 'Actions'
      }
      icon={<BoltIcon />}
      accent={actions.canStart || canTapStars ? 'secondary' : 'info'}
      subtitle={actions.canStart ? 'Today is the day — mark your event as under way' : undefined}
      sx={{ mb: 3 }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        justifyContent="space-between"
      >
        <Stack spacing={2} sx={{ minWidth: 0, flex: 1 }}>
          {canTapStars && (
            <StarRateRow
              value={review.rating}
              prompt={vendorName ? `How was ${vendorName}?` : 'How was your vendor?'}
              onRate={review.rate}
              isSaving={review.isSaving}
              justSaved={review.justSaved}
              onAddWords={review.open}
              addWordsLabel={review.hasWords ? 'Change your words' : 'Add a few words'}
              error={review.saveError}
            />
          )}

          {isFinal && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                Your rating
              </Typography>
              <RatingValue rating={review.rating} size="medium" withLabel />
              {/* Only when there is no reply to carry it. With one, the rule
                  belongs inside the reply — see below. */}
              {!review.reply && review.blockedReason && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {review.blockedReason}
                </Typography>
              )}
            </Box>
          )}

          {/* The vendor's answer, in full, on the booking it belongs to.
              Rendered outside the `isFinal` branch because a reply is a reply
              whatever state the review is in, and the client should never be
              told they have been answered by a sentence that withholds the
              answer. The "your rating is final" rule rides underneath it,
              because the reply is visibly the thing that caused it. */}
          <VendorReplyNote
            body={review.reply}
            vendorName={vendorName}
            repliedAt={review.replyAt}
            vendorAvatar={review.vendorAvatar}
            footnote={review.blockedReason}
          />

          {/* A request still awaiting the vendor has nothing to start, and a
              settled booking has nothing left. Both say so rather than leaving
              the space blank, which reads as a panel that failed to load — but
              not when the stars are there, which are something to do. */}
          {actions.hasActions ? (
            <BookingStartPanel
              canStart={actions.canStart}
              blockedReason={actions.startBlockedReason}
              isUnderway={actions.isUnderway}
              isBusy={actions.isBusy}
              onStart={() => actions.request('start')}
            />
          ) : (
            !canTapStars &&
            !isFinal && (
              <Typography variant="body2" color="text.secondary">
                There is nothing to do here right now — your vendor moves this booking on from their
                side.
              </Typography>
            )
          )}
        </Stack>

        {FEATURES.clientVendorMessaging && (
          <Button
            component={RouterLink}
            to="/messages"
            variant="text"
            startIcon={<ChatIcon />}
            sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, flexShrink: 0 }}
          >
            Message vendor
          </Button>
        )}
      </Stack>

      <BookingActionDialog
        action={actions.pending}
        reference={booking.reference_no}
        reason={actions.reason}
        onReasonChange={actions.setReason}
        busy={actions.isBusy}
        error={actions.error}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />

      {/* Opened only from "Add a few words", never to collect the rating —
          the rating is already saved by the time this can appear. */}
      <ReviewComposerDialog
        open={review.isOpen}
        mode={hasReview ? 'edit' : 'create'}
        vendorName={review.vendorName}
        bookingReference={review.reference}
        initial={
          hasReview
            ? {
                rating: review.review?.rating ?? 0,
                title: review.review?.review_title ?? '',
                body: review.review?.review_body ?? '',
              }
            : null
        }
        isBusy={review.isSaving}
        error={review.saveError}
        onSubmit={review.submit}
        onClose={review.close}
      />
    </SectionCard>
  );
}
