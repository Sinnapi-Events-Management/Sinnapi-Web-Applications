import { Box, Button, Paper, Stack, Typography } from '@sinnapi/ui';
import { LOGO_COPY } from '../schema/copy';

type Props = {
  photoUrl: string;
  busy: boolean;
  onUse: () => void;
};

/**
 * "Use the photo you already added?" — the one-click path for vendors who set
 * up their account with a photo but never added a logo. Shown, never applied
 * silently: that photo is sometimes a headshot, and the vendor decides.
 */
export default function ReuseOnboardingPhoto({ photoUrl, busy, onUse }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, width: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
        <Box
          component="img"
          src={photoUrl}
          alt="Your account photo"
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            objectFit: 'cover',
            flexShrink: 0,
            bgcolor: 'action.hover',
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {LOGO_COPY.reuse.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {LOGO_COPY.reuse.body}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={onUse}
          disabled={busy}
          sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
        >
          {LOGO_COPY.reuse.action}
        </Button>
      </Stack>
    </Paper>
  );
}
