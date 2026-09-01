import { Alert, Paper, Skeleton, Typography } from '@sinnapi/ui';
import VendorRequestDialogs from '@/components/vendor/components/organisms/VendorRequestDialogs';
import VendorSectionHeading from '../atoms/VendorSectionHeading';
import AvailabilityMonthSummary from '../molecules/AvailabilityMonthSummary';
import NextAvailableCallout from '../molecules/NextAvailableCallout';
import UnavailableDayNotice from '../molecules/UnavailableDayNotice';
import VendorAvailabilityCalendar from '../molecules/VendorAvailabilityCalendar';
import { useAvailabilityRequest } from '../../hooks/useAvailabilityRequest';
import { useVendorAvailability } from '../../hooks/useVendorAvailability';

/**
 * When this vendor is free, and what to do about it.
 *
 * Its own read rather than part of the profile payload, and its own loading and
 * error state to match: availability is the slowest-changing thing on the page
 * and the least essential to it, so a failure here should cost the visitor a
 * calendar, not the portfolio and the booking buttons in the other sections.
 *
 * The card raises its own booking dialog rather than driving the one in the
 * engage panel. The two are in different subtrees — different grid columns on
 * desktop, different sides of the tab bar on a phone — and lifting the dialog
 * to the page to share it would put transient interaction state above every
 * section that does not care about it, for a dialog that unmounts on close and
 * so has nothing to share anyway.
 *
 * Opens with the same heading as every other panel rather than its own titled
 * card. Inside a tab, a card's chrome is a second frame around content that is
 * already framed, and the calendar needs the width more than it needs a border.
 */
export default function VendorAvailabilitySection({ vendorId }: { vendorId: string }) {
  const availability = useVendorAvailability(vendorId);
  const request = useAvailabilityRequest();

  const takeNextOpen = () => {
    if (!availability.nextOpen) return;
    availability.showMonthOf(availability.nextOpen);
    request.selectDay(availability.nextOpen, 'open');
  };

  return (
    <section>
      <VendorSectionHeading
        eyebrow="Availability"
        title="When they’re free"
        subtitle="Days already spoken for. Everything else is open to request."
      />

      {availability.error ? (
        <Alert severity="info">
          Availability could not be loaded. You can still send a request — the vendor will confirm
          the date.
        </Alert>
      ) : availability.isLoading ? (
        <Skeleton variant="rounded" height={420} />
      ) : (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <AvailabilityMonthSummary summary={availability.summary} />

          {/* Only worth saying once something is actually taken. On an empty
              calendar "next open date: today" is noise dressed as help. */}
          {availability.dates.length > 0 ? (
            <NextAvailableCallout
              date={availability.nextOpen}
              inView={availability.nextOpenInView}
              onShowMonth={() =>
                availability.nextOpen && availability.showMonthOf(availability.nextOpen)
              }
              onRequest={takeNextOpen}
            />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              No dates blocked — every upcoming day is open to request.
            </Typography>
          )}

          <VendorAvailabilityCalendar
            value={request.selectedDate}
            onSelectDay={(date) => request.selectDay(date, availability.stateOf(date))}
            month={availability.month}
            onMonthChange={availability.onMonthChange}
            unavailableDates={availability.dates}
            modifiers={availability.modifiers}
            modifierLabels={availability.modifierLabels}
          />

          {request.blockedDate && (
            <UnavailableDayNotice
              date={request.blockedDate}
              nextOpen={availability.nextOpen}
              onDismiss={request.dismissBlocked}
              onTakeNextOpen={takeNextOpen}
            />
          )}
        </Paper>
      )}

      <VendorRequestDialogs
        vendorId={vendorId}
        open={request.requestDate ? 'booking' : null}
        onClose={request.closeRequest}
        eventDate={request.requestDate ?? undefined}
      />
    </section>
  );
}
