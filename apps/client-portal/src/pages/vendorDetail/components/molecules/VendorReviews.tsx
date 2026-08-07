import { Typography } from '@sinnapi/ui';

/**
 * Reviews are written against completed bookings, so there is nothing to list
 * until engagements finish; the section still appears to set the expectation.
 */
export default function VendorReviews() {
  return (
    <>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Reviews
      </Typography>
      <Typography color="text.secondary">Reviews appear after completed engagements.</Typography>
    </>
  );
}
