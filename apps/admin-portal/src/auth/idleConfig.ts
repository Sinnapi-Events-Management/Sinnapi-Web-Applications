import type { IdleTimeoutConfig } from '@sinnapi/ui';

/**
 * This portal's idle-session policy. The mechanism is shared (`useIdleTimeout`
 * in `@sinnapi/ui`); only the numbers are ours.
 *
 * Five minutes is the tightest window of the three portals, and deliberately
 * so: a logged-in console session reaches every account, payment and audit
 * record on the platform, and staff screens sit in shared offices. The client
 * (1 hour) and vendor (30 min) portals trade that strictness for the longer
 * uninterrupted sittings their work involves; nothing here is worth that trade.
 */
export const IDLE_CONFIG: IdleTimeoutConfig = {
  /** Inactivity before the warning dialog appears — 5 minutes. */
  idleMs: 5 * 60 * 1000,
  /** Countdown shown in the warning dialog before auto sign-out — 60 seconds. */
  warningMs: 60 * 1000,
  /** Per-portal key: an admin tab and a client tab keep separate idle clocks. */
  storageKey: 'sinnapi.admin.lastActivity',
};
