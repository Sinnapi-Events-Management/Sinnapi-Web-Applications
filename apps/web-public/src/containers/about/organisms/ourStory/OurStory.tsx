import Image from 'next/image';
import { Box, Container, Grid, Stack, Typography } from '@sinnapi/ui';
import { CheckCircle } from '@sinnapi/ui/icons';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import SectionHeading from '@/components/molecules/sectionHeading';
import { mutedSurface } from '@/lib/sx';
import { IMAGES } from '@/lib/assets';

// The pain points that birthed Sinnapi, from the About readMe.
const PAIN_POINTS = [
  'Finding authentic event service providers in a crowded social-media and marketplace pool.',
  'The time it takes to connect, build trust, and do due diligence before booking.',
  'Genuine vendors struggling for visibility amid immense industry competition.',
];

/**
 * Our Story — the founding narrative paired with an editorial photo. The pain
 * points are surfaced as a checklist so the "why we exist" reads at a glance.
 */
export default function OurStory() {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <Grid container spacing={{ xs: 5, md: 7 }} alignItems="center">
          {/* Editorial image */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: { xs: '4 / 3', md: '4 / 5' },
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: `0 24px 50px ${withAlpha(common.black, 0.18)}`,
              }}
            >
              <Image
                src={IMAGES.receptionAutumn.src}
                alt={IMAGES.receptionAutumn.alt}
                fill
                placeholder="blur"
                sizes="(max-width: 900px) 90vw, 45vw"
                style={{ objectFit: 'cover' }}
              />
            </Box>
          </Grid>

          {/* Narrative */}
          <Grid item xs={12} md={6}>
            <SectionHeading
              overline="Our story"
              title="Born from seven years in the events industry"
              subtitle="Sinnapi was birthed after 7+ years as event planners — experiencing first-hand, and hearing from our clients, the same recurring pain points."
            />
            <Stack spacing={1.5} sx={{ mb: 3 }}>
              {PAIN_POINTS.map((point) => (
                <Stack key={point} direction="row" spacing={1.5} alignItems="flex-start">
                  <CheckCircle sx={{ color: 'primary.main', mt: '2px' }} fontSize="small" />
                  <Typography variant="body1" color="text.secondary">
                    {point}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="body1" color="text.secondary">
              This is what birthed Sinnapi — a home where these businesses are visible and their
              work is seen, making it simple for clients to find them and plan and execute their
              events with confidence. We look forward to a future where everyone plans their event
              in minutes, with virtual assistants that screen for the very best providers nearest to
              you.
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
