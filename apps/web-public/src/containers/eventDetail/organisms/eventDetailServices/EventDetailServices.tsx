import NextLink from 'next/link';
import { Box, Paper, Stack, Typography, Chip } from '@sinnapi/ui';
import { titleize } from '@/lib/config/site';
import type { EventCardModel } from '@/lib/types';
import { suggestedServices } from '../../utils/serviceSuggestions';

/**
 * "Services this event needs" — turns the occasion into a set of vendor-category
 * chips that deep-link into the directory (`/vendors?category=…`). It fills the
 * reading column with something useful (a path back to the marketplace) instead
 * of empty space, and adapts its framing to inspiration vs. open events.
 */
export default function EventDetailServices({ event }: { event: EventCardModel }) {
  const categories = suggestedServices(event);
  if (categories.length === 0) return null;

  const isInspiration = event.source === 'admin';

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="overline" color="primary">
        {isInspiration ? 'Recreate this look' : 'What this event needs'}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, mb: 1 }}>
        {isInspiration
          ? 'Vendors who can bring this to life'
          : 'Services this event is looking for'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 560 }}>
        Explore verified vendors by category — tap any service to see who&apos;s available.
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {categories.map((category) => (
            <Chip
              key={category}
              component={NextLink}
              href={`/vendors?category=${category}`}
              label={titleize(category)}
              clickable
              variant="outlined"
              color="primary"
              sx={{
                fontWeight: 600,
                transition: 'background-color .2s ease, transform .2s ease',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'primary.secondary',
                  transform: 'translateY(-2px)',
                },
              }}
            />
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
