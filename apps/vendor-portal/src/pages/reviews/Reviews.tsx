import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import ReviewsWorkspace from './components/organisms/ReviewsWorkspace';

/**
 * A vendor's reviews.
 *
 * The screen is built around one asymmetry: a review is written once and read
 * forever. What a client leaves here is the single largest input into whether
 * the next client books, and the vendor's reply is the only part of it they
 * control — so the page is arranged as a queue of replies owed rather than as
 * an archive of scores received. That is why "Awaiting your reply" is a tile, a
 * tab and a mark in the margin of every card that needs one.
 *
 * Reputation is computed from published reviews only, everywhere on the page. A
 * review sitting in moderation is not on the public profile, so counting it in
 * the average would report a score the vendor could not find anywhere a client
 * looks — but it still appears in the list, badged, so the review count stays
 * explainable.
 *
 * The page itself is a title and a gate. Everything below it lives in
 * `ReviewsWorkspace`, which is mounted only once a vendor id exists — so no
 * hook underneath has to defend against not having one.
 */
export default function Reviews() {
  return (
    <>
      <PageTitle
        title="Reviews"
        subtitle="What clients say about your work — reply to turn a good review into proof and a hard one into a recovery."
      />
      <VendorGate>{(vendorId) => <ReviewsWorkspace vendorId={vendorId} />}</VendorGate>
    </>
  );
}
