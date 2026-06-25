import { Box, Typography, Button } from '@sinnapi/ui';
import NextLink from 'next/link';
import { SearchOff as SearchOffIcon } from '@sinnapi/ui/icons';

export default function EmptyState({
  title = 'Nothing here yet',
  description,
  ctaLabel,
  ctaHref,
}: {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 2, color: 'text.secondary' }}>
      <SearchOffIcon sx={{ fontSize: 48, color: 'grey.400' }} />
      <Typography variant="h5" sx={{ mt: 2, color: 'text.primary' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ mt: 1, maxWidth: 420, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {ctaLabel && ctaHref && (
        <Button component={NextLink} href={ctaHref} variant="contained" sx={{ mt: 3 }}>
          {ctaLabel}
        </Button>
      )}
    </Box>
  );
}
