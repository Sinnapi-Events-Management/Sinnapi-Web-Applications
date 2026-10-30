import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Paper, Stack, Typography } from '@sinnapi/ui';
import StorefrontIcon from '@mui/icons-material/Storefront';
import {
  RatingValue,
  StarRateRow,
  VendorReplyNote,
  canEditReview,
  type ReviewQueueRow,
} from '@sinnapi/ui/reviews';
import { formatDate } from '@/lib/config';

type Props = {
  row: ReviewQueueRow;
  /** Saves the tapped rating against this booking, immediately. */
  onRate: (row: ReviewQueueRow, rating: number) => void;
  /** Opens the composer for the optional headline and words. */
  onAddWords: (row: ReviewQueueRow) => void;
  /** This row's write is in flight. */
  isSaving?: boolean;
  /** This row was rated in this session, so it shows its confirmation. */
  justSaved?: boolean;
  /** This row's failed write, already a sentence. */
  error?: string | null;
};

/**
 * One booking in the client's review list, with its stars on it.
 *
 * WHAT CHANGED. The card used to carry a "Rate this vendor" button that opened
 * a dialog with an empty rating, an empty headline and an empty review body —
 * four acts to express one opinion. The stars are on the card now and a tap
 * saves; the dialog is behind "Add a few words" for the clients who have some.
 *
 * ONE CARD RATHER THAN TWO. The two states share everything that identifies the
 * row — the vendor, the event, the booking reference, the date — and differ only
 * in what hangs off the bottom. Two components would have been two copies of the
 * header, and the header is the part a client scans to find the booking they
 * mean.
 *
 * The vendor's name links to their profile. A client who has just been asked to
 * rate someone often wants to look at them again first, and that was previously
 * a trip through Discover and a search.
 */
export default function ReviewQueueCard({
  row,
  onRate,
  onAddWords,
  isSaving = false,
  justSaved = false,
  error,
}: Props) {
  const reviewed = Boolean(row.review_id);
  const editable = canEditReview({ status: row.review_status, isLocked: row.is_locked });
  // Tappable for a first rating and for a change to one, because both are the
  // same gesture and the same write. Only a vendor's reply closes the stars.
  const canTap = !reviewed || editable;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar
          src={row.vendor_image_url ?? undefined}
          alt={row.vendor_name ?? 'Vendor'}
          sx={{ width: 44, height: 44 }}
        >
          <StorefrontIcon fontSize="small" />
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.25, sm: 1 }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'baseline' }}
          >
            <Typography variant="subtitle1" sx={{ minWidth: 0 }}>
              {row.vendor_slug ? (
                <RouterLink
                  to={`/vendors/${row.vendor_slug}`}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {row.vendor_name ?? 'Vendor'}
                </RouterLink>
              ) : (
                (row.vendor_name ?? 'Vendor')
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(row.event_date)}
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {row.event_title ? `${row.event_title} · ` : ''}
            Booking{' '}
            <RouterLink
              to={`/bookings/${row.booking_id}`}
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              {row.reference_no ?? row.booking_id.slice(0, 8)}
            </RouterLink>
          </Typography>

          {canTap ? (
            <Box sx={{ mt: 1 }}>
              <StarRateRow
                value={row.rating}
                onRate={(rating) => onRate(row, rating)}
                isSaving={isSaving}
                justSaved={justSaved}
                onAddWords={() => onAddWords(row)}
                addWordsLabel={row.review_body ? 'Change your words' : 'Add a few words'}
                error={error}
              />

              {/* Shown under the stars rather than inside them: once there are
                  words, they are the review, and the stars are its score. */}
              {row.review_title && (
                <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                  {row.review_title}
                </Typography>
              )}
              {row.review_body && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.25, whiteSpace: 'pre-line' }}
                >
                  {row.review_body}
                </Typography>
              )}
            </Box>
          ) : (
            // Rated, and the vendor has replied — so the stars are a record
            // now. They stay on screen read-only, because a rating that
            // disappears once it is final looks like a rating that was lost.
            <Box sx={{ mt: 1.25 }}>
              <RatingValue rating={row.rating} size="medium" withLabel />
              {row.review_title && (
                <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                  {row.review_title}
                </Typography>
              )}
              {row.review_body && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.25, whiteSpace: 'pre-line' }}
                >
                  {row.review_body}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {row.is_locked ? 'Final — the vendor replied.' : 'This rating was taken down.'}
              </Typography>
            </Box>
          )}

          {row.reply_body && (
            <Box sx={{ mt: 1.25 }}>
              <VendorReplyNote
                body={row.reply_body}
                vendorName={row.vendor_name}
                repliedAt={row.reply_at}
                vendorAvatar={row.vendor_image_url}
              />
            </Box>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
