/**
 * Idle-session timeout — shared contract.
 *
 * A logged-in user who walks away from a portal is a security risk (an open
 * session on an unattended screen). Every Sinnapi portal answers that the same
 * way — warn after a period of inactivity, then sign out if nobody responds —
 * and differs only in how long "a period" is. That difference lives entirely in
 * `IdleTimeoutConfig`; the mechanism below is portal-agnostic.
 */

export type IdleTimeoutConfig = {
  /** Inactivity before the warning dialog appears. */
  idleMs: number;
  /** Countdown shown in the warning dialog before automatic sign-out. */
  warningMs: number;
  /**
   * localStorage key holding the last-activity timestamp. Portal-specific, so
   * two portals open side by side keep independent idle clocks — but every tab
   * of the SAME portal shares one, which is what keeps their warnings and
   * sign-outs in step.
   */
  storageKey: string;
  /** Overrides `DEFAULT_ACTIVITY_EVENTS`. */
  activityEvents?: readonly string[];
  /** Overrides `DEFAULT_ACTIVITY_THROTTLE_MS`. */
  throttleMs?: number;
  /** Overrides `DEFAULT_TICK_INTERVAL_MS`. */
  tickMs?: number;
};

export type IdleTimeoutState = {
  /** Milliseconds left in the warning countdown, or `null` when not warning. */
  warningRemainingMs: number | null;
  /** Dismiss the warning and restart the idle timer (the user is present). */
  keepSession: () => void;
};

/**
 * Passive interactions that count as "active" and reset the idle timer.
 * Keyboard/touch/scroll are included so someone reading a long page or typing
 * a message — without moving the mouse — is not falsely timed out.
 */
export const DEFAULT_ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'wheel',
  'scroll',
  'touchstart',
] as const;

/** Throttle localStorage writes on high-frequency events (mousemove/scroll). */
export const DEFAULT_ACTIVITY_THROTTLE_MS = 1000;

/** How often idle state is re-evaluated / the countdown ticks. */
export const DEFAULT_TICK_INTERVAL_MS = 1000;
