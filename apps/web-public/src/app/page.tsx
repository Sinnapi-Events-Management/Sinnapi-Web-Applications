import { getFeaturedVendors, getEvents } from '@/lib/queries';
import HeroSection from '@/components/home/heroSection';
import OurClients from '@/components/home/ourClients';
import ValueProps from '@/components/home/valueProps';
import CategoryGrid from '@/components/home/categoryGrid';
import FeaturedVendors from '@/components/home/featuredVendors';
import GalleryShowcase from '@/components/home/galleryShowcase';
import HowItWorks from '@/components/home/howItWorks';
import Testimonials from '@/components/home/testimonials';
import DualCta from '@/components/home/dualCta';
import EventsInspiration from '@/components/home/eventsInspiration';
import OurPartners from '@/components/home/ourPartners';
import FaqSection from '@/components/home/faqSection';
import FinalCta from '@/components/home/finalCta';

// Home is revalidated periodically (ISR) for fresh featured vendors & events.
export const revalidate = 3600;

export default async function HomePage() {
  const [featured, events] = await Promise.all([getFeaturedVendors(6), getEvents(3)]);

  return (
    <>
      {/* Funnel: hook → instant credibility → why → what → proof → inspiration →
          how → social proof → choose-your-path CTA → events → partners → FAQ → close. */}
      <HeroSection />
      <ValueProps />
      <CategoryGrid />
      <FeaturedVendors vendors={featured} />
      <GalleryShowcase />
      <HowItWorks />
      <OurClients />
      <Testimonials />
      <DualCta />
      <EventsInspiration events={events} />
      <OurPartners />
      <FaqSection />
      <FinalCta />
    </>
  );
}
