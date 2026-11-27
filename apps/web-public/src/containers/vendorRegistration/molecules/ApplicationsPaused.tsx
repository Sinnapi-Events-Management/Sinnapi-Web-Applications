import NextLink from 'next/link';
import { Box, Paper, Typography, Button, Stack } from '@sinnapi/ui/atoms';
import { alpha } from '@mui/material/styles';
import { PauseCircle } from '@mui/icons-material';

/**
 * Shown instead of the form when no service category is active. Every
 * application must name at least one service, so with an empty list the form
 * could never be submitted — better to say so up front than let an applicant
 * fill in every field and fail at the last step.
 */
export default function ApplicationsPaused() {
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
          color: 'warning.main',
          bgcolor: (t) => alpha(t.palette.warning.main, 0.12),
        }}
      >
        <PauseCircle sx={{ fontSize: 40 }} />
      </Box>
      <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
        Applications are paused
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 520, mx: 'auto' }}>
        We’re not accepting new vendor applications right now. Please check back soon, or contact us
        and we’ll let you know when applications reopen.
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mt: 4, justifyContent: 'center' }}
      >
        <Button component={NextLink} href="/contact" variant="contained" size="large">
          Contact us
        </Button>
        <Button component={NextLink} href="/" variant="outlined" size="large">
          Back to home
        </Button>
      </Stack>
    </Paper>
  );
}
