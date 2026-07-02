import { Container, Grid } from '@sinnapi/ui';
import SectionHeading from '@/components/molecules/sectionHeading';
import BenefitCard from './BenefitCard';
import { BENEFITS } from './data/benefits';

/**
 * Why sell on Sinnapi — the vendor value proposition as an even, scannable card
 * grid. Presentation of each card lives in BenefitCard; this organism only lays
 * out the heading and the grid.
 */
export default function VendorBenefits() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="Why sell on Sinnapi"
        title="Everything you need to win more bookings"
        subtitle="Sinnapi gives verified vendors the visibility, tools and payment protection to turn enquiries into confirmed events."
      />
      <Grid container spacing={3}>
        {BENEFITS.map(({ Icon, title, body }) => (
          <Grid item xs={12} sm={6} md={4} key={title}>
            <BenefitCard Icon={Icon} title={title} body={body} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
