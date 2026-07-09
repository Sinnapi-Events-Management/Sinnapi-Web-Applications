import { Box, Grid, Stack, Typography } from '@sinnapi/ui';
import { APP } from '@/lib/config';
import AuthShowcase from './AuthShowcase';

// Split-screen auth shell: brand showcase (left, md+) and the form column (right).
// Shared by every auth page so sign-in, forgot- and reset-password stay consistent.
export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Grid container sx={{ minHeight: '100dvh', bgcolor: 'background.paper' }}>
      <Grid item md={6} lg={7} sx={{ display: { xs: 'none', md: 'block' } }}>
        <AuthShowcase />
      </Grid>

      {/* children section - right column with form and title/subtitle, centered vertically and horizontally */}
      <Grid item xs={12} md={6} lg={5} sx={{ bgcolor: 'secondary.lightest' }}>
        <Box
          sx={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { xs: 3, sm: 6, lg: 8 },
            py: { xs: 5, md: 6 },
          }}
        >
          <Stack
            spacing={3}
            sx={{ width: '100%', maxWidth: 420, mx: 'auto', flex: 1, justifyContent: 'center' }}
          >
            <Box>
              <Typography variant="h3" sx={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {children}
          </Stack>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 4, textAlign: 'center', maxWidth: 420, mx: 'auto' }}
          >
            © {new Date().getFullYear()} {APP.name}. All rights reserved.
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
}
