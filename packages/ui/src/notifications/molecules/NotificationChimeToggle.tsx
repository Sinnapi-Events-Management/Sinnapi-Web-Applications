'use client';
import { Chip, Tooltip } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import type { NotificationChime } from '../hooks/useNotificationChime';

export type NotificationChimeToggleProps = {
  chime: NotificationChime;
};

/**
 * Opt-in control for the arrival sound.
 *
 * Deliberately a sibling of `DesktopAlertsToggle` rather than folded into it:
 * they answer different questions. The desktop toast is "tell me when I am
 * looking elsewhere"; the chime is "make a noise when something lands, wherever
 * I am looking". Plenty of people want exactly one of those, and a single
 * switch would force them to take both.
 *
 * The click is load-bearing beyond recording the preference — it is the user
 * gesture the browser requires before an `AudioContext` may be resumed. See
 * `useNotificationChime`.
 */
export function NotificationChimeToggle({ chime }: NotificationChimeToggleProps) {
  if (!chime.supported) return null;

  if (chime.enabled) {
    return (
      <Tooltip title="A short chime plays when a notification arrives, whether or not this tab is in front. Click to turn it off.">
        <Chip
          size="small"
          color="success"
          variant="outlined"
          icon={<VolumeUpIcon />}
          label="Sound on"
          onClick={chime.disable}
          aria-pressed
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Play a short chime when a notification arrives, so you hear it even with the portal open in front of you.">
      <Chip
        size="small"
        variant="outlined"
        icon={<VolumeOffIcon />}
        label="Enable sound"
        onClick={() => void chime.enable()}
        aria-pressed={false}
      />
    </Tooltip>
  );
}
