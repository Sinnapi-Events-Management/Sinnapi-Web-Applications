'use client';
import { Chip, Tooltip } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationAddIcon from '@mui/icons-material/NotificationAdd';
import type { DesktopNotifications } from '../hooks/useDesktopNotifications';

export type DesktopAlertsToggleProps = {
  alerts: DesktopNotifications;
};

/**
 * Opt-in control for OS-level alerts.
 *
 * The permission prompt fires from this click and nowhere else. Browsers
 * penalise — and users reflexively block — a `requestPermission()` that arrives
 * unprompted on page load, and a permission denied that way cannot be asked for
 * again from inside the app.
 *
 * Renders nothing when the browser has no Notification API, and degrades to a
 * disabled explanation once permission is denied, because at that point the
 * only fix lives in browser settings and a button that cannot work is worse
 * than a sentence saying so.
 */
export function DesktopAlertsToggle({ alerts }: DesktopAlertsToggleProps) {
  if (!alerts.supported) return null;

  if (alerts.permission === 'denied') {
    return (
      <Tooltip title="Your browser is blocking notifications for this site. Re-allow them in its site settings.">
        <Chip
          size="small"
          variant="outlined"
          icon={<NotificationsOffIcon />}
          label="Desktop alerts blocked"
          sx={{ color: 'text.disabled' }}
        />
      </Tooltip>
    );
  }

  if (alerts.enabled) {
    return (
      <Tooltip title="Desktop alerts are on for new notifications while this tab is in the background. Click to turn them off.">
        <Chip
          size="small"
          color="success"
          variant="outlined"
          icon={<NotificationsActiveIcon />}
          label="Desktop alerts on"
          onClick={alerts.disable}
          aria-pressed
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Get notified on your desktop when something arrives while this tab is in the background.">
      <Chip
        size="small"
        variant="outlined"
        icon={<NotificationAddIcon />}
        label="Enable desktop alerts"
        onClick={() => void alerts.enable()}
        aria-pressed={false}
      />
    </Tooltip>
  );
}
