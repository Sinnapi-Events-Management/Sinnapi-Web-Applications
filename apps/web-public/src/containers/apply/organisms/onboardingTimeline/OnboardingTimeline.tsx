import NextLink from 'next/link';
import { Box, Container, Grid, Stack, Button } from '@sinnapi/ui/atoms';
import { ArrowForward } from '@mui/icons-material';
import SectionHeading from '@/components/molecules/sectionHeading';
import { mutedSurface } from '@/lib/sx';
import TimelineStep from './TimelineStep';
import { ONBOARDING_STEPS } from './data/steps';

const APPLY_HREF = '/apply/register';

/**
 * How onboarding works — a narrative on the left, a vertical numbered rail of
 * the five stages on the right. Each stage is a TimelineStep; this organism
 * sequences them and pairs the journey with a primary call to action.
 */
export default function OnboardingTimeline() {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <Grid container spacing={{ xs: 4, md: 7 }}>
          <Grid item xs={12} md={5}>
            <SectionHeading
              overline="How onboarding works"
              title="From application to your first booking"
              subtitle="A clear, guided path — most vendors are reviewed within a few business days and live shortly after."
            />
            <Button
              component={NextLink}
              href={APPLY_HREF}
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
            >
              Start your application
            </Button>
          </Grid>

          <Grid item xs={12} md={7}>
            <Stack>
              {ONBOARDING_STEPS.map(({ Icon, title, body }, i) => (
                <TimelineStep
                  key={title}
                  index={i + 1}
                  Icon={Icon}
                  title={title}
                  body={body}
                  isLast={i === ONBOARDING_STEPS.length - 1}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
