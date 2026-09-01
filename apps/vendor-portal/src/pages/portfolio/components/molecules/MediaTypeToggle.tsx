import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@sinnapi/ui';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { MediaType } from '../../schema';

type Props = {
  value: MediaType;
  /** False on Starter, where video is not part of the plan. */
  allowsVideo: boolean;
  disabled: boolean;
  onChange: (next: MediaType) => void;
};

/**
 * Photo or video, as a segmented control rather than a select.
 *
 * It is the first decision in the dialog and it changes everything below it —
 * which bucket, which formats, which size cap — so it is worth two visible
 * options instead of a closed dropdown. When the plan excludes video the button
 * stays *visible* but locked: hiding it would leave a vendor wondering whether
 * the platform supports video at all, where a padlock and a sentence tell them
 * it exists and what it takes to get it.
 */
export default function MediaTypeToggle({ value, allowsVideo, disabled, onChange }: Props) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
        What are you adding?
      </Typography>

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value}
        disabled={disabled}
        onChange={(_, next: MediaType | null) => next && onChange(next)}
        aria-label="Media type"
      >
        <ToggleButton value="image" sx={{ gap: 1, textTransform: 'none', fontWeight: 600 }}>
          <ImageOutlinedIcon fontSize="small" />
          Photo
        </ToggleButton>

        <Tooltip title={allowsVideo ? '' : 'Video is available on Professional and Elite'}>
          <span style={{ display: 'flex', flex: 1 }}>
            <ToggleButton
              value="video"
              disabled={disabled || !allowsVideo}
              sx={{ gap: 1, flex: 1, textTransform: 'none', fontWeight: 600 }}
            >
              {allowsVideo ? (
                <MovieOutlinedIcon fontSize="small" />
              ) : (
                <LockOutlinedIcon fontSize="small" />
              )}
              Video
            </ToggleButton>
          </span>
        </Tooltip>
      </ToggleButtonGroup>

      {!allowsVideo && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Upgrade to Professional or Elite to add video to your portfolio.
        </Typography>
      )}
    </Box>
  );
}
