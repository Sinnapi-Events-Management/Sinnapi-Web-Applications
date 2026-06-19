import { Box, Container, Typography, Paper } from '@sinnapi/ui';
import { APP } from '@/lib/config';

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
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
      <Box sx={{ p: 3 }}>
        <Box
          component="a"
          href={APP.publicUrl}
          sx={{
            fontFamily: '"Fraunces", serif',
            fontWeight: 600,
            fontSize: 24,
            color: 'primary.main',
            textDecoration: 'none',
          }}
        >
          {APP.name}
        </Box>
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
    </Box>
  );
}
