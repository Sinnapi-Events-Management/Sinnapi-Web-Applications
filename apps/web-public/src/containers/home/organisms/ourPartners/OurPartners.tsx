import { Box, Container, Grid } from '@sinnapi/ui';
import SectionHeading from '@/components/molecules/sectionHeading';
import { mutedSurface } from '@/lib/sx';
import { PARTNERS } from './data/partners';
import PartnerCard from './molecules/PartnerCard';

export default function OurPartners() {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <SectionHeading
          align="center"
          overline="Our partners"
          title="Powered by partners you can trust"
          subtitle="We work with leading payment, logistics, and hospitality partners to keep every booking secure and seamless."
        />
        <Grid container spacing={3} justifyContent="center">
          {PARTNERS.map((partner) => (
            <Grid item xs={6} sm={4} md={3} key={partner.name}>
              <PartnerCard partner={partner} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
