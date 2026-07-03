import { notFound } from 'next/navigation';
import { Container, Grid } from '@sinnapi/ui/atoms';
import { SITE } from '@/lib/config/site';
import EventDetailHero from './organisms/eventDetailHero';
import EventDetailHighlights from './organisms/eventDetailHighlights';
import EventDetailOverview from './organisms/eventDetailOverview';
import EventDetailServices from './organisms/eventDetailServices';
import EventDetailSidebar from './organisms/eventDetailSidebar';
import RelatedEvents from './organisms/relatedEvents';
import MarketplaceCta from '@/components/organisms/marketplaceCta';
import EventTips from '@/components/organisms/eventTips';
import { getEventDetailData } from './hooks/getEventDetailData';

/**
 * Event detail page. Composes the experience as: an immersive cover hero →
 * a two-column body (story on the left, a sticky key-details + CTA card on the
 * right) → a related-events rail. Data (live with a mock fallback) and SEO
 * structured data are resolved here; presentation lives in the organisms.
 */
export default async function EventDetailContainer({ params }: { params: { id: string } }) {
  const { event, related } = await getEventDetailData(params.id);
  if (!event) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.event_date ?? undefined,
    image: event.cover_image_url ?? undefined,
    location: event.location ? { '@type': 'Place', name: event.location } : undefined,
    url: `${SITE.url}/events/${event.id}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <EventDetailHero event={event} />

      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <EventDetailHighlights event={event} />

        <Grid container spacing={{ xs: 4, md: 5 }} sx={{ mt: { xs: 1, md: 2 } }}>
          <Grid item xs={12} md={7} lg={8}>
            <EventDetailOverview event={event} />
            <EventDetailServices event={event} />
          </Grid>
          <Grid item xs={12} md={5} lg={4}>
            <EventDetailSidebar event={event} />
          </Grid>
        </Grid>
      </Container>

      <RelatedEvents events={related} />

      <EventTips
        eventType={event.event_type}
        surface="plain"
        title="Tips for a flawless event"
        subtitle="Advice tailored to this occasion — for hosts in Uganda, the diaspora planning from abroad, and beyond."
      />

      <MarketplaceCta
        title="Find the right vendors for your event"
        subtitle="Browse verified, vetted providers for every part of your event — or join Sinnapi as a vendor and reach clients planning theirs."
        primary={{ label: 'Browse vendors', href: '/vendors' }}
        secondary={{ label: 'Become a vendor', href: '/apply' }}
      />
    </>
  );
}
