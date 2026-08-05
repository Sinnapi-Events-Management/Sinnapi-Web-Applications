import type { IdleTimeoutConfig } from '@sinnapi/ui';

/**
 * This portal's idle-session policy. The mechanism is shared (`useIdleTimeout`
 * in `@sinnapi/ui`); only the numbers are ours.
 *
 * Half an hour sits between the client portal's hour and the admin console's
 * five minutes, which is where a vendor session belongs: it can move money
 * (payout details, escrow releases) and read a stream of clients' event and
 * contact data, so an unattended screen here costs more than a client's — but
 * vendors work in long sittings on quotes and bookings, and a five-minute
 * window would interrupt them constantly.
 */
export const IDLE_CONFIG: IdleTimeoutConfig = {
  /** Inactivity before the warning dialog appears — 30 minutes. */
  idleMs: 30 * 60 * 1000,
  /** Countdown shown in the warning dialog before auto sign-out — 60 seconds. */
  warningMs: 60 * 1000,
  /** Per-portal key: a vendor tab and a client tab keep separate idle clocks. */
  storageKey: 'sinnapi.vendor.lastActivity',
};
