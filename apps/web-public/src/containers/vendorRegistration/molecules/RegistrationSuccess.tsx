import NextLink from 'next/link';
import { Box, Paper, Typography, Button, Stack } from '@sinnapi/ui/atoms';
import { CheckCircle } from '@mui/icons-material';
import { withAlpha, palette } from '@sinnapi/ui/tokens';

/** Confirmation shown after a successful application submission. */
export default function RegistrationSuccess() {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 4, md: 6 }, borderRadius: 3, textAlign: 'center' }}>
      <Box
        aria-hidden
        sx={{
          width: 72,
          height: 72,
          mx: 'auto',
          mb: 2,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'success.main',
          bgcolor: withAlpha(palette.light.success.main, 0.12),
        }}
      >
        <CheckCircle sx={{ fontSize: 40 }} />
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Application received
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 520, mx: 'auto' }}>
        Thank you for applying to become a Sinnapi vendor. Our team will review your details and
        verification documents and get back to you by email. This usually takes 2–3 business days.
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mt: 4, justifyContent: 'center' }}
      >
        <Button component={NextLink} href="/" variant="contained" size="large">
          Back to home
        </Button>
        <Button component={NextLink} href="/vendors" variant="outlined" size="large">
          Explore vendors
        </Button>
      </Stack>
    </Paper>
  );
}
