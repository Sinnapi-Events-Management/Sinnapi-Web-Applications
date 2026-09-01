import { Box, Stack, Typography } from '@sinnapi/ui/atoms';
import VendorSectionHeading from '../../atoms/VendorSectionHeading';
import RatingSummary from './molecules/RatingSummary';
import ReviewCard from './molecules/ReviewCard';
import type { PublicReview, VendorDetailModel } from '@/lib/types';

/**
 * What clients said: the aggregate first, then the individual write-ups.
 *
 * The summary leads because it is the number a visitor comparing two vendors
 * actually uses, and because it is the one thing worth saying when there are no
 * write-ups to show — an empty section that only says "no reviews yet" reads as
 * a warning, where the same absence next to "no completed bookings rated yet"
 * reads as what it is: a vendor nobody has finished with yet.
 */
export default function VendorDetailReviews({
  vendor,
  reviews,
}: {
  vendor: VendorDetailModel;
  reviews: PublicReview[];
}) {
  return (
    <Box component="section">
      <VendorSectionHeading
        eyebrow="Reviews"
        title="What clients say"
        subtitle="Ratings come from clients whose bookings with this vendor have completed."
      />

      <Stack spacing={2}>
        <RatingSummary vendor={vendor} />

        {reviews.length === 0 ? (
          <Typography color="text.secondary">
            No written reviews yet — be the first to work with {vendor.business_name}.
          </Typography>
        ) : (
          reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        )}
      </Stack>
    </Box>
  );
}
