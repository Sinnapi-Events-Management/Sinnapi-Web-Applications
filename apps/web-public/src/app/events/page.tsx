import type { Metadata } from "next";
import { Container, Grid } from "@mui/material";
import { PageHeader } from "@/components/common/SectionHeading";
import EventCard from "@/components/event/EventCard";
import EmptyState from "@/components/common/EmptyState";
import { getEvents } from "@/lib/queries";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Events & inspiration",
  description: "Explore real events and inspiration, and discover open events looking for vendors.",
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const events = await getEvents();
  return (
    <>
      <PageHeader title="Events & inspiration" subtitle="Browse curated inspiration and open events. Vendors can express interest after signing in." />
      <Container sx={{ py: 4 }}>
        {events.length === 0 ? (
          <EmptyState title="No events published yet" description="Check back soon for event inspiration and open opportunities." />
        ) : (
          <Grid container spacing={3}>
            {events.map((e) => <Grid item xs={12} sm={6} md={4} key={e.id}><EventCard event={e} /></Grid>)}
          </Grid>
        )}
      </Container>
    </>
  );
}
