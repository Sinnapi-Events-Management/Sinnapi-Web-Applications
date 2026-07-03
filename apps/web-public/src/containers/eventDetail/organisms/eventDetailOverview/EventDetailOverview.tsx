import { Box, Typography, Stack } from '@sinnapi/ui/atoms';
import ScrollReveal from '@/components/atoms/scrollReveal';
import type { EventCardModel } from '@/lib/types';

/**
 * The reading column of the detail page. Renders the event's story as spaced
 * paragraphs (split on blank lines) and reveals on scroll for a calm entrance.
 * Falls back to source-aware copy when an event has no description so the column
 * is never empty.
 */
export default function EventDetailOverview({ event }: { event: EventCardModel }) {
  const paragraphs =
    event.description
      ?.split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean) ?? [];

  const fallback =
    event.source === 'admin'
      ? 'A curated piece of inspiration to spark ideas for your own celebration. Explore the look, then find verified vendors to recreate it.'
      : 'An open event looking for vendors. Sign in to express interest and share how you can help bring it to life.';

  return (
    <ScrollReveal>
      <Box>
        <Typography variant="overline" color="primary">
          Overview
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, mb: 2.5 }}>
          About this event
        </Typography>

        {paragraphs.length > 0 ? (
          <Stack spacing={2}>
            {paragraphs.map((paragraph, i) => (
              <Typography key={i} variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {paragraph}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            {fallback}
          </Typography>
        )}
      </Box>
    </ScrollReveal>
  );
}
