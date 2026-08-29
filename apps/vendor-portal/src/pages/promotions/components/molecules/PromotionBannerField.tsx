import { useRef } from 'react';
import { Alert, Box, Button, IconButton, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { COVER_ACCEPT } from '@/lib/packageCover';
import { usePromotionBanner } from '../../hooks/usePromotionBanner';

type Props = {
  vendorId: string;
  /** The saved URL, or '' — the form field's value. */
  value: string;
  onChange: (url: string) => void;
};

/**
 * The artwork across the top of a campaign card.
 *
 * Shows the local preview while the upload is in flight and the stored URL once
 * it lands, so the picture appears the instant it is picked rather than after a
 * round trip. The band is 16:7 — the ratio the card renders and the uploader
 * crops to — so what the vendor approves here is exactly what clients see.
 */
export default function PromotionBannerField({ vendorId, value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const { busy, error, preview, upload, clear } = usePromotionBanner(vendorId, onChange);
  const shown = preview ?? (value || null);

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>
        Banner
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Optional. A wide image for this campaign — it is the first thing a client sees.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          mt: 1.5,
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          aspectRatio: '16 / 7',
          border: (t) => `1px dashed ${t.palette.divider}`,
          // Tinted from the foreground rather than a fixed grey, so the empty
          // well reads as a surface on both the light and the warm dark canvas.
          bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.08 : 0.03),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {shown ? (
          <>
            <Box
              component="img"
              src={shown}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <IconButton
              aria-label="Remove banner"
              onClick={clear}
              disabled={busy}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0, 0, 0, 0.55)',
                color: 'common.white',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.72)' },
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <Stack alignItems="center" spacing={0.5} sx={{ color: 'text.disabled' }}>
            <ImageOutlinedIcon sx={{ fontSize: 36 }} />
            <Typography variant="caption">No banner yet</Typography>
          </Stack>
        )}
      </Box>

      <Button
        size="small"
        onClick={() => input.current?.click()}
        disabled={busy}
        sx={{ mt: 1 }}
        startIcon={<ImageOutlinedIcon />}
      >
        {busy ? 'Uploading…' : shown ? 'Replace banner' : 'Upload banner'}
      </Button>

      <input
        ref={input}
        type="file"
        accept={COVER_ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so picking the same file twice after a failure still fires.
          event.target.value = '';
          if (file) upload(file);
        }}
      />
    </Box>
  );
}
