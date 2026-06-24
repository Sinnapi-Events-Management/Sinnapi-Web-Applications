import NextLink from 'next/link';
import { Box, Container, Stack, Typography, SecondaryButton } from '@sinnapi/ui';
import { common, withAlpha } from '@sinnapi/ui/tokens';

export default function FinalCta() {
  return (
    <Box
      sx={{
        color: 'common.white',
        // Brand teal ramp, sourced from the primary palette tokens (CSS variables).
        background:
          'linear-gradient(135deg, var(--mui-palette-primary-dark) 0%, var(--mui-palette-primary-main) 60%, var(--mui-palette-primary-light) 100%)',
        py: { xs: 7, md: 9 },
        // In dark mode drop the bright brand gradient for the near-black background
        // tokens. Selector set on <html> by ColorModeProvider.
        '[data-mui-color-scheme="dark"] &': {
          background:
            'linear-gradient(135deg, var(--mui-palette-background-default) 0%, var(--mui-palette-background-paper) 100%)',
        },
      }}
    >
      <Container>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h3" sx={{ color: 'common.white' }}>
              Ready to plan your event?
            </Typography>
            <Typography sx={{ mt: 1, color: withAlpha(common.white, 0.85) }}>
              Create a free account to chat, request quotes, and book with confidence.
            </Typography>
          </Box>
          <SecondaryButton
            component={NextLink}
            href="/sign-up"
            size="large"
            sx={{
              // Gold CTA in light mode; switch to the primary teal in dark mode.
              '[data-mui-color-scheme="dark"] &': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { backgroundColor: 'primary.dark' },
              },
            }}
          >
            Get started
          </SecondaryButton>
        </Stack>
      </Container>
    </Box>
  );
}
