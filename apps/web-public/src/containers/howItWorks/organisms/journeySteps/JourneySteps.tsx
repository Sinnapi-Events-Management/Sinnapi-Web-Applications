import { Container, Grid } from '@sinnapi/ui';
import SectionHeading from '@/components/molecules/sectionHeading';
import StepTimeline from './molecules/StepTimeline';
import { CLIENT_JOURNEY, VENDOR_JOURNEY } from './data/journeys';

/**
 * The two Sinnapi journeys side by side — clients on the left, vendors on the
 * right — each rendered as a connected, reveal-on-scroll timeline. Stacks to a
 * single column on small screens. Content lives in `data/journeys`; this file
 * only lays out the section.
 */
export default function JourneySteps() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="The process"
        title="How Sinnapi works, step by step"
        subtitle="Two simple paths to the same goal — trusted connections and events that come together effortlessly."
      />
      <Grid container spacing={{ xs: 5, md: 6 }}>
        <Grid item xs={12} md={6}>
          <StepTimeline {...CLIENT_JOURNEY} />
        </Grid>
        <Grid item xs={12} md={6}>
          <StepTimeline {...VENDOR_JOURNEY} />
        </Grid>
      </Grid>
    </Container>
  );
}
