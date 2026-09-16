import NextLink from 'next/link';
import { Box, Paper, Typography, Button, Stack } from '@sinnapi/ui/atoms';
import { alpha } from '@mui/material/styles';
import { CheckCircle } from '@mui/icons-material';

/** Confirmation shown after a successful application submission. */
export default function RegistrationSuccess() {
  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 3, sm: 4, md: 6 }, borderRadius: 3, textAlign: 'center' }}
    >
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
          bgcolor: (t) => alpha(t.palette.success.main, 0.12),
        }}
      >
        <CheckCircle sx={{ fontSize: 40 }} />
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Application received
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 520, mx: 'auto' }}>
        Thank you for applying to become a Sinnapi vendor. Our team will review your application and
        may contact you to verify your business. You’ll hear back by email, usually within 2–3
        business days.
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
