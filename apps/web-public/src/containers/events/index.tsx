import { Container, Grid } from '@sinnapi/ui';
import { PageHeader } from '@/components/molecules/sectionHeading';
import EventCard from '@/components/molecules/eventCard';
import EmptyState from '@/components/molecules/emptyState';
import { getEventsData } from './hooks/getEventsData';

export default async function EventsContainer() {
  const { events } = await getEventsData();
  return (
    <>
      <PageHeader
        title="Events & inspiration"
        subtitle="Browse curated inspiration and open events. Vendors can express interest after signing in."
      />
      <Container sx={{ py: 4 }}>
        {events.length === 0 ? (
          <EmptyState
            title="No events published yet"
            description="Check back soon for event inspiration and open opportunities."
          />
        ) : (
          <Grid container spacing={3}>
            {events.map((e) => (
              <Grid item xs={12} sm={6} md={4} key={e.id}>
                <EventCard event={e} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </>
  );
}
