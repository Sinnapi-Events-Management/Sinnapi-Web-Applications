import { Grid, Card, CardContent, Typography, Stack, Chip, Box } from '@sinnapi/ui';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import ExpressInterestButton from '@/components/events/ExpressInterestButton';
import { usePublicEvents, useMyInterests } from '@/hooks/queries';
import { formatDate, titleize } from '@/lib/config';

function EventsList({ vendorId }: { vendorId: string }) {
  const events = usePublicEvents();
  const interests = useMyInterests(vendorId);
  const interestedIds = new Set((interests.data ?? []).map((i) => i.event_id));
  const rows = events.data ?? [];

  return (
    <QueryState isLoading={events.isLoading} error={events.error}>
      {rows.length === 0 ? (
        <EmptyState
          title="No public events"
          description="Open events posted by clients and admins appear here."
        />
      ) : (
        <Grid container spacing={3}>
          {rows.map((e) => (
            <Grid item xs={12} sm={6} md={4} key={e.id}>
              <Card
                variant="outlined"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    {e.event_type && <Chip size="small" label={titleize(e.event_type)} />}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={e.source === 'admin' ? 'Inspiration' : 'Open event'}
                    />
                  </Stack>
                  <Typography variant="h6">{e.title}</Typography>
                  <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {e.event_date && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <EventIcon fontSize="inherit" />
                        <Typography variant="body2">{formatDate(e.event_date)}</Typography>
                      </Stack>
                    )}
                    {e.location && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <PlaceIcon fontSize="inherit" />
                        <Typography variant="body2">{e.location}</Typography>
                      </Stack>
                    )}
                  </Stack>
                  {e.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {e.description}
                    </Typography>
                  )}
                </CardContent>
                <Box sx={{ p: 2, pt: 0 }}>
                  {e.source === 'client' ? (
                    <ExpressInterestButton
                      eventId={e.id}
                      vendorId={vendorId}
                      already={interestedIds.has(e.id)}
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Inspiration only
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </QueryState>
  );
}

export default function PublicEvents() {
  return (
    <>
      <PageTitle
        title="Public events"
        subtitle="Express interest in open events posted by clients."
      />
      <VendorGate>{(vendorId) => <EventsList vendorId={vendorId} />}</VendorGate>
    </>
  );
}
