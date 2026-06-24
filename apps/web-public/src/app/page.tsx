import { getFeaturedVendors, getEvents } from '@/lib/queries';
import HeroSection from '@/components/home/heroSection';
import ValueProps from '@/components/home/valueProps';
import CategoryGrid from '@/components/home/categoryGrid';
import FeaturedVendors from '@/components/home/featuredVendors';
import HowItWorks from '@/components/home/howItWorks';
import EventsInspiration from '@/components/home/eventsInspiration';
import Testimonials from '@/components/home/testimonials';
import OurClients from '@/components/home/ourClients';
import DualCta from '@/components/home/dualCta';
import FaqSection from '@/components/home/faqSection';
import OurPartners from '@/components/home/ourPartners';
import FinalCta from '@/components/home/finalCta';

// Home is revalidated periodically (ISR) for fresh featured vendors & events.
export const revalidate = 3600;

export default async function HomePage() {
  const [featured, events] = await Promise.all([getFeaturedVendors(6), getEvents(3)]);

  return (
    <>
      <HeroSection />
      <ValueProps />
      <FeaturedVendors vendors={featured} />
      <CategoryGrid />
      <HowItWorks />
      <EventsInspiration events={events} />
      <Testimonials />
      <OurClients />
      <DualCta />
      <FaqSection />
      <OurPartners />
      <FinalCta />
    </>
  );
}
