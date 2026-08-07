import { Box, Container, Typography, Paper } from '@sinnapi/ui';
import AuthBrandMark from './AuthBrandMark';
import { APP } from '@/lib/config';

export default function AuthFormPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        // The themed canvas, not `secondary.lightest` directly: that token is a
        // pale tint in BOTH schemes, so hardcoding it would paint a near-white
        // page in dark mode. `background.default` already resolves to the pale
        // gold in light and the warm deep tone in dark.
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ p: 3 }}>
        <AuthBrandMark />
      </Box>
      <Container
        maxWidth="sm"
        sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}
      >
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, width: '100%' }}>
          <Typography variant="h4">{title}</Typography>
          {subtitle && (
            <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
              {subtitle}
            </Typography>
          )}
          {!subtitle && <Box sx={{ mb: 2 }} />}
          {children}
        </Paper>
      </Container>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 4, textAlign: 'center', maxWidth: 420, mx: 'auto' }}
      >
        © {new Date().getFullYear()} {APP.name}. All rights reserved.
      </Typography>
    </Box>
  );
}
