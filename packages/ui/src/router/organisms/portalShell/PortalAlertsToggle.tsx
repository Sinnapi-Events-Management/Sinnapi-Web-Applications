'use client';
import { IconButton, Tooltip } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationAddIcon from '@mui/icons-material/NotificationAdd';
import type { PortalDesktopAlerts } from './types';

export type PortalAlertsToggleProps = {
  alerts: PortalDesktopAlerts;
  /** What the alerts are about, e.g. "new messages". Used in the tooltip copy. */
  subject: string;
};

/**
 * Compact desktop-alerts switch for a panel header.
 *
 * The same two-switch model the notifications kit uses — browser permission and
 * a local opt-in — in an icon-sized control, because a header has room for a
 * button and not for the labelled chip the settings surface can afford.
 *
 * The permission prompt fires from this click and nowhere else. A
 * `requestPermission()` on page load is what browsers penalise and users
 * reflexively block, and a denial obtained that way cannot be re-asked from
 * inside the app.
 */
export function PortalAlertsToggle({ alerts, subject }: PortalAlertsToggleProps) {
  if (!alerts.supported) return null;

  if (alerts.permission === 'denied') {
    return (
      <Tooltip title="Your browser is blocking notifications for this site. Re-allow them in its site settings.">
        {/* A disabled button is not focusable, so the tooltip needs a live wrapper. */}
        <span>
          <IconButton size="small" disabled aria-label="Desktop alerts blocked by the browser">
            <NotificationsOffIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  const on = alerts.enabled;

  return (
    <Tooltip
      title={
        on
          ? `Desktop alerts are on for ${subject} while this tab is in the background. Click to turn them off.`
          : `Get a desktop alert for ${subject} while this tab is in the background.`
      }
    >
      <IconButton
        size="small"
        onClick={() => (on ? alerts.disable() : void alerts.enable())}
        aria-pressed={on}
        aria-label={
          on ? `Turn off desktop alerts for ${subject}` : `Turn on desktop alerts for ${subject}`
        }
        sx={{ color: on ? 'success.main' : 'text.secondary' }}
      >
        {on ? (
          <NotificationsActiveIcon fontSize="small" />
        ) : (
          <NotificationAddIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}
