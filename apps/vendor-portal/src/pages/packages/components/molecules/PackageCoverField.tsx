import { useRef } from 'react';
import { Alert, Box, Button, IconButton, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { COVER_ACCEPT } from '@/lib/packageCover';
import { usePackageCover } from '../../hooks/usePackageCover';

type Props = {
  vendorId: string;
  /** The saved URL, or '' — the form field's value. */
  value: string;
  onChange: (url: string) => void;
};

/**
 * The photograph at the top of the package card.
 *
 * Shows the local preview while the upload is in flight and the stored URL
 * once it lands, so the picture appears the instant it is picked rather than
 * after a round trip. The band is 16:7 — the same ratio the card renders — so
 * what the vendor approves here is the crop that gets published.
 */
export default function PackageCoverField({ vendorId, value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const { busy, error, preview, upload, clear } = usePackageCover(vendorId, onChange);
  const shown = preview ?? (value || null);

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>
        Cover image
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Optional. A wide photo of this package delivered — it is the first thing a client sees.
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
              aria-label="Remove cover image"
              onClick={clear}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                // Fixed dark scrim rather than a palette colour: this sits on
                // an arbitrary photograph, where theme background offers no
                // contrast guarantee in either mode.
                bgcolor: 'rgba(0,0,0,0.55)',
                color: 'common.white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.72)' },
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <Stack alignItems="center" spacing={1} sx={{ p: 2 }}>
            <ImageOutlinedIcon sx={{ color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              No cover yet
            </Typography>
          </Stack>
        )}
      </Box>

      <Button size="small" onClick={() => input.current?.click()} disabled={busy} sx={{ mt: 1 }}>
        {busy ? 'Uploading…' : shown ? 'Replace image' : 'Upload image'}
      </Button>

      <input
        ref={input}
        type="file"
        accept={COVER_ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so picking the same file twice still fires a change.
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
    </Box>
  );
}
