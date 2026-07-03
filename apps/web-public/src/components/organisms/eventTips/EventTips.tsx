import { Box, Container, Grid, Typography } from '@sinnapi/ui/atoms';
import ScrollReveal from '@/components/atoms/scrollReveal';
import { mutedSurface } from '@/lib/sx';
import TipCard from './molecules/TipCard';
import { AUDIENCE_LABELS, selectEventTips } from './data/tips';

type EventTipsProps = {
  /** Tailors the tips to an occasion (detail page); omit for the general set. */
  eventType?: string | null;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Max tips to show — defaults to a tidy 6 (3 × 2 on desktop). */
  limit?: number;
  /** Section background: 'muted' for alternation, 'plain' between other bands. */
  surface?: 'muted' | 'plain';
};

/**
 * Shared "planning tips" band — a curated, blended set of advice for hosts in
 * Uganda, the diaspora planning from abroad, and international best practice.
 * Reused on the events listing (general tips above the marketplace CTA) and the
 * event detail page (tailored to the event's occasion). Tips are presentational
 * data, so this whole section is server-rendered; cards cascade in on scroll to
 * match the rest of the site. Renders nothing if there are no tips to show.
 */
export default function EventTips({
  eventType,
  eyebrow = 'Plan with confidence',
  title = 'Tips for a flawless event',
  subtitle = 'Hard-won advice for celebrations in Uganda — whether you’re planning at home, from the diaspora, or anywhere in between.',
  limit = 6,
  surface = 'muted',
}: EventTipsProps) {
  const tips = selectEventTips(eventType, limit);
  if (tips.length === 0) return null;

  return (
    <Box sx={{ ...(surface === 'muted' ? mutedSurface : {}), py: { xs: 6, md: 9 } }}>
      <Container>
        <Typography variant="overline" color="primary">
          {eyebrow}
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, mb: 1 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 640 }}>
          {subtitle}
        </Typography>

        <Grid container spacing={3}>
          {tips.map((tip, i) => (
            <Grid item xs={12} sm={6} md={4} key={tip.id}>
              <ScrollReveal delay={i * 60} sx={{ height: '100%' }}>
                <TipCard
                  icon={tip.icon}
                  title={tip.title}
                  body={tip.body}
                  tag={AUDIENCE_LABELS[tip.audience]}
                />
              </ScrollReveal>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
