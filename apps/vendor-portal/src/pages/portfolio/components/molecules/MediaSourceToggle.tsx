import { Stack, ToggleButton, ToggleButtonGroup } from '@sinnapi/ui';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import type { MediaSourceMode } from '../../schema';

type Props = {
  value: MediaSourceMode;
  disabled: boolean;
  onChange: (next: MediaSourceMode) => void;
};

/**
 * Upload from the device, or point at something already online.
 *
 * Both are kept because they solve different problems: uploads are the normal
 * path and the one that keeps the media on our own storage, while a link is the
 * only way to bring in a YouTube or Vimeo showreel — which is where most vendors'
 * video already lives, and which we could not host at that size anyway.
 */
export default function MediaSourceToggle({ value, disabled, onChange }: Props) {
  return (
    <Stack direction="row">
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        disabled={disabled}
        onChange={(_, next: MediaSourceMode | null) => next && onChange(next)}
        aria-label="Where the media comes from"
      >
        <ToggleButton value="upload" sx={{ gap: 0.75, textTransform: 'none', px: 1.5 }}>
          <UploadFileOutlinedIcon fontSize="small" />
          Upload
        </ToggleButton>
        <ToggleButton value="link" sx={{ gap: 0.75, textTransform: 'none', px: 1.5 }}>
          <LinkRoundedIcon fontSize="small" />
          Paste a link
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
