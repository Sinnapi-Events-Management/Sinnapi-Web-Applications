import NextLink from 'next/link';
import { Box, Paper, Stack, Typography, Link } from '@sinnapi/ui';
import { ArrowForward } from '@sinnapi/ui/icons';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import type { ContactMethod } from '../data/methods';

/**
 * A single contact-route card: tinted icon, title, blurb, and an arrow CTA.
 * Reuses the platform card idiom (outlined Paper + hover lift) so it sits
 * naturally beside the About page's WhyChoose / MissionVision cards.
 */
export default function MethodCard({
  Icon,
  title,
  body,
  actionLabel,
  href,
  external,
}: ContactMethod) {
  const linkProps = external
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { component: NextLink, href };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow .2s, transform .2s, border-color .2s',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-4px)',
          borderColor: 'primary.main',
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.main',
          bgcolor: withAlpha(palette.light.primary.main, 0.1),
        }}
      >
        <Icon />
      </Box>
      <Typography variant="h6" sx={{ mt: 2 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, flexGrow: 1 }}>
        {body}
      </Typography>
      <Link
        {...linkProps}
        underline="hover"
        sx={{ mt: 2, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <span>{actionLabel}</span>
          <ArrowForward fontSize="small" />
        </Stack>
      </Link>
    </Paper>
  );
}
