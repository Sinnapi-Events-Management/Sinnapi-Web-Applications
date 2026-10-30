import { SectionCard, Stack, Typography } from '@sinnapi/ui';
import StarRateRoundedIcon from '@mui/icons-material/StarRateRounded';
import { RatingValue } from '@sinnapi/ui/reviews';
import ReviewResponse from '@/components/reviews/organisms/ReviewResponse';
import { formatDate, formatRelative } from '@/lib/config';
import { useClientReview } from '../../hooks/useClientReview';

type Props = {
  bookingId: string;
  /** From the profile directory — `profiles` is not readable by the vendor. */
  clientName: string | null | undefined;
};

/** Why a review is not on the public profile, in the vendor's terms. */
const WITHHELD: Record<string, string> = {
  pending: 'We are checking this rating, so clients cannot see it yet.',
  hidden: 'This rating is not showing on your profile.',
  removed: 'This rating has been taken down and is not on your profile.',
};

/**
 * The client's rating of this booking, pinned above the tabs.
 *
 * WHY IT IS ON THIS PAGE AT ALL. The review was only on the Reviews page — a
 * list of every review the vendor has ever had, filtered and sorted. A vendor
 * who wanted to know how one job went had to leave the booking, find that page,
 * and recognise the right card by the client's name and a relative date. Most
 * of our vendors are not reading a dashboard; they are reading *this booking*,
 * and the rating is the last fact about it.
 *
 * WHY IT IS ABOVE THE TABS AND NOT IN "PROGRESS". It is both a fact and a job:
 * an unanswered review is work, and work on this page lives above the tabs with
 * the actions — the same reason the client's own rating control sits in their
 * action bar rather than in a section. A card filed one tab deep is a card we
 * would be told nobody found, which is how this change started.
 *
 * WHY IT DISAPPEARS COMPLETELY WHEN THERE IS NO REVIEW. Most bookings have
 * none, and a permanent card headed "What your client said" explaining that the
 * client has not said anything is a card on every booking page in the portal
 * earning nothing. The Reviews page is where the absence of reviews is a fact
 * worth stating.
 *
 * The score is read through the shared `RatingValue`, so the stars and the word
 * beside them ("Good", "Very good") are the same ones the client tapped and the
 * same ones the public profile prints. The reply is the shared control the
 * Reviews page uses, so there is one reply form in the portal.
 */
export default function BookingReviewCard({ bookingId, clientName }: Props) {
  const { review, hasReview, reply, needsReply, withheldStatus } = useClientReview(bookingId);

  // No review, still loading, or a failed secondary read: nothing is shown. The
  // booking itself is the page, and this is context on it.
  if (!hasReview || !review) return null;

  const hasWords = Boolean(review.title || review.body);

  return (
    <SectionCard
      title="What your client said"
      icon={<StarRateRoundedIcon />}
      // Gold only while a reply is owed. An answered review is a record, and a
      // record drawn in the portal's accent competes with the actions above it.
      accent={needsReply ? 'secondary' : 'info'}
      subtitle={needsReply ? 'You have not replied yet' : undefined}
      sx={{ mb: 3 }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
          <RatingValue rating={review.rating} size="medium" withLabel />
          <Typography variant="caption" color="text.secondary">
            {clientName || 'Your client'} · {formatRelative(review.created_at)}
            {/* A review the client corrected is not the one the vendor was
                notified about, so the change is named rather than hidden. */}
            {review.edited_at ? ` · changed ${formatDate(review.edited_at)}` : ''}
          </Typography>
        </Stack>

        {review.title && (
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {review.title}
          </Typography>
        )}

        {/* `pre-wrap`: clients write in paragraphs, and collapsing their line
            breaks turns a considered review into a wall the vendor skims. */}
        {review.body && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {review.body}
          </Typography>
        )}

        {/* A bare rating is a complete review — the client portal saves one on a
            single tap — so the empty case is stated rather than left as a gap
            the vendor reads as a loading failure. */}
        {!hasWords && (
          <Typography variant="body2" color="text.secondary">
            They left a rating without writing anything.
          </Typography>
        )}

        {withheldStatus && (
          <Typography variant="body2" color="text.secondary">
            {WITHHELD[withheldStatus] ?? 'This rating is not showing on your profile.'}
          </Typography>
        )}

        <ReviewResponse reviewId={review.id} existing={reply ?? undefined} />
      </Stack>
    </SectionCard>
  );
}
