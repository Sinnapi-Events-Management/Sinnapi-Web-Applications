import { PageTitle, QueryState, Stack, Typography } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { ReviewComposerDialog } from '@sinnapi/ui/reviews';
import ReviewQueueCard from './components/molecules/ReviewQueueCard';
import { useReviews } from './hooks/useReviews';

/**
 * The client's ratings: the ones still owed, and the ones already left.
 *
 * WHAT THIS PAGE USED TO BE. First a read-only list that was always empty,
 * because nothing in the product could write a review — the booking page's
 * "Leave a review" button linked here, so a client followed it, read "No
 * reviews yet → View bookings", and arrived back where they started. Then two
 * titled section cards, each with a subtitle and a paragraph, over rows whose
 * only control was a button that opened a dialog.
 *
 * WHAT IT IS NOW. The rows, with their stars on them. A client who lands here
 * sees the vendors they can rate and taps a star; nothing is read first, and
 * nothing is opened. The two groups are separated by one short line each
 * instead of a card apiece, because a heading that explains the list underneath
 * it is a heading on a list that was not clear enough.
 *
 * WHY THE OUTSTANDING ROWS LEAD. This page is read for one of two reasons and
 * only one of them is a task: either the client is doing the thing they were
 * asked to do, or they are looking back at what they said. The task goes first,
 * and its count is in its heading so a client with one rating left can see that
 * from the top.
 *
 * Layout only — `useReviews` owns the read, the split, the per-row write and
 * the composer, and the composer itself is the shared dialog the booking page
 * and the vendor profile also open.
 */
export default function Reviews() {
  const {
    rows,
    awaiting,
    written,
    outstanding,
    isLoading,
    error,
    editing,
    open,
    close,
    rate,
    submit,
    busyId,
    saved,
    rowError,
    isSaving,
    saveError,
  } = useReviews();

  return (
    <>
      <PageTitle title="My ratings" subtitle="Tap a star to rate a vendor you worked with." />

      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing to rate yet"
            description="You can rate a vendor once your event starts."
            ctaLabel="View bookings"
            ctaHref="/bookings"
          />
        ) : (
          <Stack spacing={1.5}>
            {awaiting.length > 0 && (
              <Typography variant="overline" color="text.secondary">
                {outstanding > 0 ? `Rate these vendors (${outstanding})` : 'Just rated'}
              </Typography>
            )}

            {awaiting.map((row) => (
              <ReviewQueueCard
                key={row.booking_id}
                row={row}
                onRate={rate}
                onAddWords={open}
                isSaving={busyId === row.booking_id}
                justSaved={saved.includes(row.booking_id)}
                error={rowError?.bookingId === row.booking_id ? rowError.message : null}
              />
            ))}

            {/* Omitted entirely until there is a history, rather than shown as
                a heading over an explanation of its own emptiness. */}
            {written.length > 0 && (
              <Typography variant="overline" color="text.secondary" sx={{ pt: 1 }}>
                Already rated
              </Typography>
            )}

            {written.map((row) => (
              <ReviewQueueCard
                key={row.booking_id}
                row={row}
                onRate={rate}
                onAddWords={open}
                isSaving={busyId === row.booking_id}
                justSaved={saved.includes(row.booking_id)}
                error={rowError?.bookingId === row.booking_id ? rowError.message : null}
              />
            ))}
          </Stack>
        )}
      </QueryState>

      <ReviewComposerDialog
        open={editing != null}
        mode={editing?.review_id ? 'edit' : 'create'}
        vendorName={editing?.vendor_name}
        bookingReference={editing?.reference_no}
        initial={
          editing?.review_id
            ? {
                rating: editing.rating ?? 0,
                title: editing.review_title ?? '',
                body: editing.review_body ?? '',
              }
            : null
        }
        isBusy={isSaving}
        error={saveError}
        onSubmit={submit}
        onClose={close}
      />
    </>
  );
}
