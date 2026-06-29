import { Container, Grid } from '@sinnapi/ui';
import SectionHeading from '@/components/molecules/sectionHeading';
import { CONTACT_METHODS } from './data/methods';
import MethodCard from './molecules/MethodCard';

/**
 * Contact-method cards — four routes that point each visitor at the right team
 * before they reach the form, reducing misrouted messages.
 */
export default function ContactMethods() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="How can we help?"
        title="Pick the best way to reach us"
        subtitle="Choose the option that fits your enquiry — or scroll down to send us a message directly."
      />
      <Grid container spacing={3}>
        {CONTACT_METHODS.map((method) => (
          <Grid item xs={12} sm={6} md={3} key={method.title}>
            <MethodCard {...method} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
