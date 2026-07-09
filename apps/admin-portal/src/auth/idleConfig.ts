// Idle-session timeout configuration.
//
// A logged-in admin who walks away from the portal is a security risk (open
// session on an unattended screen). After a period of inactivity we warn them
// with a countdown, then sign them out automatically if they don't respond.

/** Inactivity before the warning dialog appears — 5 minutes. */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

/** Countdown shown in the warning dialog before auto sign-out — 60 seconds. */
export const WARNING_DURATION_MS = 60 * 1000;

/**
 * Passive interactions that count as "active" and reset the idle timer.
 * Includes keyboard/touch/scroll so a user reading or typing (without moving
 * the mouse) is not falsely timed out.
 */
export const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'wheel',
  'scroll',
  'touchstart',
] as const;

/**
 * Shared localStorage key holding the last-activity timestamp. All tabs read
 * and write the same key so idle state, the warning, and sign-out stay in sync
 * across every open tab of the portal.
 */
export const LAST_ACTIVITY_KEY = 'sinnapi.admin.lastActivity';

/** Throttle localStorage writes on high-frequency events (mousemove/scroll). */
export const ACTIVITY_THROTTLE_MS = 1000;

/** How often idle state is re-evaluated / the countdown ticks. */
export const TICK_INTERVAL_MS = 1000;
