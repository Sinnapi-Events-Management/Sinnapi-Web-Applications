import { Container } from '@sinnapi/ui/atoms';
import SectionHeading from '@/components/molecules/sectionHeading';
import { CLIENTS } from './data/clients';
import OurClientsSlider from './molecules/OurClientsSlider';

export default function OurClients() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="Our clients"
        title="Trusted by Uganda's leading brands"
        subtitle="From corporate galas to product launches, teams across the country plan with Sinnapi."
      />
      {/* Interactive client carousel (client component) — keeps this section a
          server component while delegating the embla state to the slider. */}
      <OurClientsSlider clients={CLIENTS} />
    </Container>
  );
}
