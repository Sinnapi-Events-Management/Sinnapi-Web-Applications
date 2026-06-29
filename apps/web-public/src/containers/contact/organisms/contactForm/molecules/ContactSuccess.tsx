import { Box, Stack, Typography } from '@sinnapi/ui';
import { CheckCircle } from '@sinnapi/ui/icons';
import { palette, withAlpha } from '@sinnapi/ui/tokens';

/**
 * Confirmation shown in place of the form after a successful submit. A calm,
 * centred state — not a terse alert — so the page still feels considered once
 * the message is on its way.
 */
export default function ContactSuccess() {
  return (
    <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: 4 }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'success.main',
          bgcolor: withAlpha(palette.light.success.main, 0.12),
        }}
      >
        <CheckCircle fontSize="large" />
      </Box>
      <Typography variant="h5">Message sent</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        Thanks for reaching out — our team will get back to you within one business day.
      </Typography>
    </Stack>
  );
}
