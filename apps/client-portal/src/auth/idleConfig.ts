import type { IdleTimeoutConfig } from '@sinnapi/ui';

/**
 * This portal's idle-session policy. The mechanism is shared (`useIdleTimeout`
 * in `@sinnapi/ui`); only the numbers are ours.
 *
 * An hour is deliberately longer than the vendor (30 min) and admin (5 min)
 * windows. A client's session carries the least authority of the three — no
 * payouts, no other people's data, no console — and the work done here is
 * bursty by nature: reading quotes, waiting on a vendor to reply, coming back
 * to an event page later in the evening. Timing that person out mid-plan costs
 * more than the small exposure it buys.
 */
export const IDLE_CONFIG: IdleTimeoutConfig = {
  /** Inactivity before the warning dialog appears — 1 hour. */
  idleMs: 60 * 60 * 1000,
  /** Countdown shown in the warning dialog before auto sign-out — 60 seconds. */
  warningMs: 60 * 1000,
  /** Per-portal key: a client tab and a vendor tab keep separate idle clocks. */
  storageKey: 'sinnapi.client.lastActivity',
};
