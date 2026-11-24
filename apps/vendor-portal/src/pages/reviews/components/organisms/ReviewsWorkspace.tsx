import { Box, QueryState, Typography } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useReviews } from '../../hooks/useReviews';
import { useReviewFilters } from '../../hooks/useReviewFilters';
import ReviewsSummary from './ReviewsSummary';
import ReviewsToolbar from './ReviewsToolbar';
import ReviewsList from './ReviewsList';

/**
 * The reviews screen for one vendor: what the reviews add up to, the controls
 * over them, and the reviews themselves.
 *
 * All of the state is in two hooks — `useReviews` for the joined rows and every
 * figure derived from them, `useReviewFilters` for the three controls — so this
 * component is the arrangement and nothing else. That split is what keeps a
 * keystroke in the search box from re-deriving the average and the
 * distribution, and lets the layout change without anyone re-reading how a
 * score is computed.
 *
 * A vendor with no reviews at all gets the empty state on its own. Four zeroes,
 * an empty distribution and a toolbar filtering nothing is a worse first screen
 * than one sentence explaining where reviews come from — and it is also the
 * screen every vendor sees on their first day, so it is worth getting right.
 *
 * The empty state points at Bookings rather than at nothing. Reviews are
 * written off completed bookings, so the only thing a vendor can actually do
 * about having none is to go and deliver one.
 */
export default function ReviewsWorkspace({ vendorId }: { vendorId: string }) {
  const { rows, bands, counts, average, publishedCount, isLoading, error, isEmpty } =
    useReviews(vendorId);
  const filters = useReviewFilters(rows);

  // Reviews waiting for an answer come first (2026-11-17) — they were last.
  // Shown once: the list below leaves them out while they lead the page.
  const awaiting = rows.filter((r) => r.reply === null);
  const showWaiting = awaiting.length > 0 && filters.reply !== 'awaiting';
  const listRows = showWaiting ? filters.visible.filter((r) => r.reply !== null) : filters.visible;

  return (
    <QueryState isLoading={isLoading} error={error}>
      {isEmpty ? (
        <EmptyState
          title="No reviews yet"
          description="Clients can review you once a booking is complete. Every review lands here, and replying to it is what turns a good one into proof and a hard one into a recovery."
          ctaLabel="View your bookings"
          ctaHref="/bookings"
        />
      ) : (
        <>
          {showWaiting && (
            <Box component="section" sx={{ mb: 3 }}>
              <Typography variant="h6" component="h2" fontWeight={700} sx={{ mb: 1 }}>
                Waiting for your reply ({awaiting.length})
              </Typography>
              <ReviewsList
                rows={awaiting}
                isFilteredEmpty={false}
                onClearFilters={filters.clearAll}
              />
            </Box>
          )}

          <ReviewsSummary
            bands={bands}
            average={average}
            publishedCount={publishedCount}
            star={filters.star}
            onSelectStar={filters.toggleStar}
          />

          <ReviewsToolbar
            reply={filters.reply}
            counts={counts}
            onReply={filters.setReply}
            term={filters.term}
            onTerm={filters.setTerm}
            onClearTerm={filters.clearTerm}
            sort={filters.sort}
            onSort={filters.setSort}
            star={filters.star}
            onClearStar={() => filters.toggleStar(filters.star)}
          />

          <ReviewsList
            rows={listRows}
            isFilteredEmpty={filters.isFilteredEmpty}
            onClearFilters={filters.clearAll}
          />
        </>
      )}
    </QueryState>
  );
}
