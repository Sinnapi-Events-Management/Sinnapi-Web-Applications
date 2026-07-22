import { useRef } from 'react';
import { Avatar, Box, Button, CircularProgress, Stack, Typography, alpha } from '@sinnapi/ui';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { AVATAR_ACCEPT } from '@/lib/image';

type Props = {
  /** Currently stored avatar, or the in-flight local preview. */
  src: string | null;
  /** Seeds the fallback initial when there's no image. */
  name: string;
  busy: boolean;
  maxSizeMb: number;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

const AVATAR_PX = 112;

/**
 * Circular avatar with pick / remove affordances.
 *
 * The whole avatar is the click target — that's the interaction people expect
 * from a profile picture — but it's a real `<button>` with a hidden file input
 * behind it, so it stays keyboard-reachable and screen-reader-legible rather
 * than being a clickable `div`. The explicit "Change photo" button is kept
 * alongside because the tap-the-picture affordance isn't discoverable on its own.
 */
export default function AvatarPicker({ src, name, busy, maxSizeMb, onSelect, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset first so re-picking the same file still fires a change event.
    e.target.value = '';
    if (file) onSelect(file);
  }

  return (
    <Stack alignItems="center" spacing={2}>
      <Box sx={{ position: 'relative' }}>
        <Box
          component="button"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Change profile photo"
          sx={{
            p: 0,
            border: 0,
            borderRadius: '50%',
            background: 'none',
            cursor: busy ? 'default' : 'pointer',
            display: 'block',
            '&:hover .avatar-overlay': { opacity: busy ? 0 : 1 },
            '&:focus-visible': {
              outline: (t) => `2px solid ${t.palette.primary.main}`,
              outlineOffset: 3,
            },
          }}
        >
          <Avatar
            src={src ?? undefined}
            sx={{
              width: AVATAR_PX,
              height: AVATAR_PX,
              fontSize: 40,
              fontWeight: 600,
              border: (t) => `3px solid ${t.palette.background.paper}`,
              boxShadow: (t) => `0 0 0 1px ${t.palette.divider}`,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Avatar>

          <Box
            className="avatar-overlay"
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'common.white',
              bgcolor: (t) => alpha(t.palette.common.black, 0.45),
              opacity: 0,
              transition: 'opacity .15s',
              pointerEvents: 'none',
            }}
          >
            <PhotoCameraIcon />
          </Box>
        </Box>

        {busy && (
          <CircularProgress
            size={AVATAR_PX + 10}
            thickness={2}
            sx={{ position: 'absolute', top: -5, left: -5 }}
          />
        )}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        onChange={handleChange}
        hidden
        // The visible button above carries the accessible name; hiding this from
        // the a11y tree stops screen readers announcing an unlabelled duplicate.
        aria-hidden
        tabIndex={-1}
      />

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PhotoCameraIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {src ? 'Change photo' : 'Upload photo'}
        </Button>
        {src && (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={onRemove}
            disabled={busy}
          >
            Remove
          </Button>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary" textAlign="center">
        JPG, PNG, WebP or AVIF — up to {maxSizeMb} MB. Square crops look best.
      </Typography>
    </Stack>
  );
}
