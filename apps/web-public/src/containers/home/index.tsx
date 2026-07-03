import { getHomeData } from './utils/getHomeData';
import HeroSection from './organisms/heroSection';
import ValueProps from './organisms/valueProps';
import CategoryGrid from './organisms/categoryGrid';
import FeaturedVendors from './organisms/featuredVendors';
import GalleryShowcase from './organisms/galleryShowcase';
import HowItWorks from './organisms/howItWorks';
import OurClients from './organisms/ourClients';
import Testimonials from './organisms/testimonials';
import DualCta from './organisms/dualCta';
import EventsInspiration from './organisms/eventsInspiration';
import OurPartners from './organisms/ourPartners';
import FaqSection from './organisms/faqSection';
import FinalCta from './organisms/finalCta';

/**
 * Home page container. Composes the home organisms and delegates all data
 * fetching to the getHomeData server loader (presentation vs. logic split).
 */
export default async function HomeContainer() {
  const { featured, events } = await getHomeData();

  return (
    <>
      {/* Funnel: hook → instant credibility → why → what → proof → inspiration →
          how → social proof → choose-your-path CTA → events → partners → FAQ → close. */}
      <HeroSection />
      <ValueProps />
      <FeaturedVendors vendors={featured} />
      <GalleryShowcase />
      <HowItWorks />
      <EventsInspiration events={events} />
      <DualCta />
      <CategoryGrid />
      <OurClients />
      <Testimonials />
      <OurPartners />
      <FaqSection />
      <FinalCta />
    </>
  );
}
