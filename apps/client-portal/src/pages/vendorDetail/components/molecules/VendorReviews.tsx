import { Stack, Typography } from '@sinnapi/ui';
import VendorSectionHeading from '../atoms/VendorSectionHeading';
import VendorRatingSummary from './VendorRatingSummary';
import type { VendorDetailModel } from '@/lib/types';

/**
 * What other clients thought.
 *
 * The individual reviews are not read here yet — the portal has no per-vendor
 * review query, only the client's own — so the section leads with the aggregate
 * the vendor row already carries and says plainly that the write-ups are not
 * shown. That is a smaller claim than the score alone was making, and the score
 * is the part a visitor comparing two vendors actually uses.
 */
export default function VendorReviews({ vendor }: { vendor: VendorDetailModel }) {
  return (
    <section>
      <VendorSectionHeading
        eyebrow="Reviews"
        title="What clients say"
        subtitle="Ratings come from clients whose bookings with this vendor have completed."
      />

      <Stack spacing={2}>
        <VendorRatingSummary vendor={vendor} />
        <Typography variant="body2" color="text.secondary">
          {vendor.review_count > 0
            ? 'Written reviews aren’t shown on the profile yet — the score above is the average of every rating left after a completed booking.'
            : 'No ratings yet. Reviews appear here once a booking with this vendor completes.'}
        </Typography>
      </Stack>
    </section>
  );
}
