import { Box, Stack, Typography } from '@sinnapi/ui';
import AuthBrandMark from './AuthBrandMark';
import AuthPageHeading from './AuthPageHeading';
import { useAuthBrand } from './hooks/useAuthBrand';

/**
 * Right-hand column of the split-screen auth shell: heading, the page's form,
 * and the copyright line pinned underneath. Matches the admin console column —
 * the form sits on the tinted canvas rather than in a card, so the two portals
 * read as one product.
 *
 * The canvas is `background.default`, not the `secondary.lightest` token it
 * resolves to in light mode: that token is a pale tint in BOTH schemes, so
 * naming it directly would paint a near-white page in dark mode.
 */
export default function AuthFormPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { name, year } = useAuthBrand();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: { xs: 3, sm: 6, lg: 8 },
        py: { xs: 5, md: 6 },
      }}
    >
      <AuthBrandMark />

      <Stack
        spacing={3}
        sx={{ width: '100%', maxWidth: 420, mx: 'auto', flex: 1, justifyContent: 'center' }}
      >
        <AuthPageHeading title={title} subtitle={subtitle} />
        {children}
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 4, textAlign: 'center', maxWidth: 420, mx: 'auto' }}
      >
        © {year} {name}. All rights reserved.
      </Typography>
    </Box>
  );
}
