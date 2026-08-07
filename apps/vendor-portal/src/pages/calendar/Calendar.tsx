import { Grid, Card, CardContent, Typography, PageTitle, QueryState } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import { useCalendar } from './hooks/useCalendar';
import BlockDateForm from './components/molecules/BlockDateForm';
import BlockedDateList from './components/molecules/BlockedDateList';

function CalendarManager({ vendorId }: { vendorId: string }) {
  const { blocked, rows, unblock } = useCalendar(vendorId);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Block a date
            </Typography>
            <BlockDateForm vendorId={vendorId} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Unavailable dates
            </Typography>
            <QueryState isLoading={blocked.isLoading} error={blocked.error}>
              <BlockedDateList rows={rows} onUnblock={unblock} />
            </QueryState>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default function Calendar() {
  return (
    <>
      <PageTitle
        title="Calendar & availability"
        subtitle="Block dates you're unavailable. Confirmed bookings block dates automatically."
      />
      <VendorGate>{(vendorId) => <CalendarManager vendorId={vendorId} />}</VendorGate>
    </>
  );
}
