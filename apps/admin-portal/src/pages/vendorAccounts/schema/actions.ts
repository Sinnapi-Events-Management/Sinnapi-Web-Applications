import type { VendorAccountModel } from '@/lib/types';

/**
 * The vendor account lifecycle, as data.
 *
 * Four transitions, each with its own consequence copy, its own justification
 * rules and its own set of states it may be reached from. Spreading that across
 * a menu component and a dialog component is how the two drift: the menu offers
 * "Block" from a state the dialog describes wrongly, or a reason field appears
 * for an action the Edge Function does not require one for. Both read this
 * instead, so there is exactly one place where the rules live and one place to
 * change them.
 *
 * `requiresReason` and the `from` sets mirror `manage-vendor-account` on
 * purpose. The server is the enforcement — this is the UI refusing to offer a
 * button that would be rejected, which is a different job and needs its own
 * copy of the rule.
 */
export const LIFECYCLE_ACTIONS = ['suspend', 'deactivate', 'block', 'activate'] as const;

export type LifecycleAction = (typeof LIFECYCLE_ACTIONS)[number];

export type LifecycleSpec = {
  action: LifecycleAction;
  /** Row-menu label. */
  label: string;
  /** Dialog heading. */
  title: (name: string) => string;
  /** What actually happens — the consequence, never "are you sure". */
  description: (name: string) => string;
  confirmLabel: string;
  /** Drives the dialog's badge and primary button colour. */
  tone: 'primary' | 'secondary' | 'error' | 'success';
  /** Access-removing actions must be justified; restoring access need not be. */
  requiresReason: boolean;
  /** Only a suspension carries an end date. */
  requiresUntil: boolean;
  /** Account statuses this action is offered from. */
  from: readonly string[];
};

const SPECS: Record<LifecycleAction, LifecycleSpec> = {
  suspend: {
    action: 'suspend',
    label: 'Suspend account',
    title: (name) => `Suspend ${name}?`,
    description: (name) =>
      `${name} will be signed out and unable to sign in to the vendor portal until the date you set, ` +
      `when the suspension lifts by itself. Their listing, bookings and payouts are untouched.`,
    confirmLabel: 'Suspend account',
    tone: 'secondary',
    requiresReason: true,
    requiresUntil: true,
    from: ['active', 'pending'],
  },
  deactivate: {
    action: 'deactivate',
    label: 'Deactivate account',
    title: (name) => `Deactivate ${name}?`,
    description: (name) =>
      `${name} will be signed out and unable to sign in until an admin reactivates them. Use this ` +
      `when a vendor has asked to be switched off or has gone dormant — it carries no suggestion of ` +
      `wrongdoing and is reversed in one click.`,
    confirmLabel: 'Deactivate account',
    tone: 'secondary',
    requiresReason: true,
    requiresUntil: false,
    from: ['active', 'pending', 'suspended'],
  },
  block: {
    action: 'block',
    label: 'Block account',
    title: (name) => `Block ${name}?`,
    description: (name) =>
      `${name} will be signed out and permanently barred from signing in. Use this for abuse, fraud ` +
      `or a chargeback pattern — it is recorded as a deliberate enforcement decision, not routine ` +
      `housekeeping, and the reason you give is what a colleague will read before reversing it.`,
    confirmLabel: 'Block account',
    tone: 'error',
    requiresReason: true,
    requiresUntil: false,
    from: ['active', 'pending', 'suspended', 'deactivated'],
  },
  activate: {
    action: 'activate',
    label: 'Activate account',
    title: (name) => `Activate ${name}?`,
    description: (name) =>
      `${name} will be able to sign in again with their existing credentials, and any block or ` +
      `suspension on the account is cleared.`,
    confirmLabel: 'Activate account',
    tone: 'success',
    requiresReason: false,
    requiresUntil: false,
    from: ['pending', 'suspended', 'deactivated', 'blocked'],
  },
};

export function lifecycleSpec(action: LifecycleAction): LifecycleSpec {
  return SPECS[action];
}

/** The transitions offered for an account in this state, in menu order. */
export function availableActions(status: string): LifecycleSpec[] {
  return LIFECYCLE_ACTIONS.map((a) => SPECS[a]).filter((s) => s.from.includes(status));
}

/**
 * Suspension lengths offered as one-click options, plus a custom date.
 *
 * Presets rather than a bare date picker because the realistic answers are a
 * handful of round numbers, and typing a date is where an operator fat-fingers
 * a year. `null` days means "let me pick".
 */
export const SUSPENSION_PRESETS: { label: string; days: number | null }[] = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'Custom date…', days: null },
];

/**
 * Can this account be sent a fresh one-time password?
 *
 * Only when the vendor has never signed in. The password issued at promotion is
 * never stored, so an account stuck here cannot be helped any other way — but
 * once they have signed in they own a password of their own, and replacing it
 * silently from a support screen is not support, it is a lockout. Those vendors
 * get the reset link instead, which leaves them in control.
 *
 * The suspended / blocked / deactivated states are excluded because the portal
 * gate refuses them regardless: mailing a working-looking credential to someone
 * who cannot use it is the most confusing possible outcome. `manage-vendor-
 * account` enforces the same rule server-side.
 */
export function canResendCredentials(row: VendorAccountModel): boolean {
  return !row.last_login_at && ['active', 'pending'].includes(row.account_status);
}
