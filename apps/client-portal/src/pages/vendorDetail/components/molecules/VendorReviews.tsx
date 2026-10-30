import { Link as RouterLink } from 'react-router-dom';
import { Button, QueryState, Stack } from '@sinnapi/ui';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  RatingSummaryPanel,
  ReviewComposerDialog,
  ReviewList,
  ReviewPromptBar,
} from '@sinnapi/ui/reviews';
import type { VendorDetailModel } from '@/lib/types';
import { useVendorReviewsTab } from '../../hooks/useVendorReviewsTab';

/**
 * What other clients thought — on screen immediately, with no reading first.
 *
 * WHAT CLIENTS TOLD US ABOUT THE LAST VERSION. They opened a tab called
 * Reviews and met, in order: a section heading with an eyebrow and a sentence
 * of subtitle, a card holding one large number, and a panel explaining in two
 * or three sentences whether they personally were allowed to write one. The
 * first actual review was below the fold of a phone. The feedback was that the
 * review screens were "too much reading" — and the people saying it are rating
 * a vendor on a phone, in English they read slowly or not at all.
 *
 * SO THE ORDER IS INVERTED. The stars come first, because for the one client
 * who can rate this vendor they are the task, and tapping one is the entire
 * interaction — it saves on the tap. Then the score, as a single line. Then the
 * reviews, which is what everybody else came for and what a visitor who has
 * never booked now sees at the top of the tab.
 *
 * WHAT WAS REMOVED RATHER THAN MOVED:
 *   the section heading   a heading reading "Reviews / What clients say" above
 *                         a list of reviews, inside a tab labelled Reviews
 *   the score card        now one line, same figure and same denominator
 *   the eligibility prose two of its six states had something a client could
 *                         act on; those are a short line now. The rest said
 *                         nothing a reader of this tab needed, loudest of all
 *                         to the visitor who had never booked this vendor
 *   the own-review echo   the client's rating was printed in a panel above the
 *                         list *and* again inside it. It is one row now, first
 *                         in the list, and the Change button lives on it —
 *                         which is the edit control the panel used to hold
 *
 * The composer still exists for the clients who want to write something, opened
 * from "Add a few words" once a rating is already saved. It is the same dialog
 * the booking page and the Reviews page open.
 */
export default function VendorReviews({ vendor }: { vendor: VendorDetailModel }) {
  const tab = useVendorReviewsTab(vendor.id);
  const isEdit = Boolean(tab.state?.review_id);

  return (
    <section>
      <Stack spacing={2}>
        <ReviewPromptBar
          state={tab.state}
          vendorName={vendor.business_name}
          onRate={tab.rate}
          isSaving={tab.isSaving}
          justSaved={tab.justSaved}
          onAddWords={tab.open}
          error={tab.saveError}
          // Passed as a render prop so the reviews kit stays free of a router
          // dependency — the same reason `EmptyState` lives outside the root
          // barrel. This is the one case where the action is on another page:
          // the client has to start the event, and that button is on the
          // booking.
          bookingLink={(bookingId, label) => (
            <Button
              key={bookingId}
              size="small"
              component={RouterLink}
              to={`/bookings/${bookingId}`}
              variant="outlined"
              startIcon={<OpenInNewIcon />}
            >
              {label}
            </Button>
          )}
        />

        <RatingSummaryPanel
          avgRating={vendor.avg_rating}
          reviewCount={vendor.review_count}
          variant="inline"
        />

        <QueryState isLoading={tab.isLoading} error={tab.error}>
          <ReviewList
            reviews={tab.reviews}
            vendorName={vendor.business_name}
            onLoadMore={tab.loadMore}
            isLoadingMore={tab.isLoadingMore}
            myReviewId={tab.myReviewId}
            canEditMine={tab.canEditMine}
            onEditMine={tab.open}
            myReviewFallback={tab.myReview}
          />
        </QueryState>
      </Stack>

      <ReviewComposerDialog
        open={tab.isOpen}
        mode={isEdit ? 'edit' : 'create'}
        vendorName={vendor.business_name}
        bookingReference={tab.state?.reference_no}
        initial={
          isEdit
            ? {
                rating: tab.state?.rating ?? 0,
                title: tab.state?.review_title ?? '',
                body: tab.state?.review_body ?? '',
              }
            : null
        }
        isBusy={tab.isSaving}
        error={tab.saveError}
        onSubmit={tab.submit}
        onClose={tab.close}
      />
    </section>
  );
}
