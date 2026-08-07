'use client';
import { Chip, Tooltip } from '@mui/material';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';

/**
 * The way back out of focus mode. Because focus mode unmounts the sidebar and
 * the top bar, this floating pill is the only visible affordance left — Esc
 * does the same thing (see `useViewPreferences`).
 */
export function PortalFocusExit({ onExit }: { onExit: () => void }) {
  return (
    <Tooltip title="Exit focus mode (Esc)">
      <Chip
        icon={<CloseFullscreenIcon fontSize="small" />}
        label="Exit focus"
        onClick={onExit}
        size="small"
        sx={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: (t) => t.zIndex.appBar + 1,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          boxShadow: 2,
        }}
      />
    </Tooltip>
  );
}
