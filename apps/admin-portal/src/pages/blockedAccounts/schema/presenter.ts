import { parseUserAgent } from '@/lib/userAgent';
import { countryFlag, maskIp } from '@/lib/network';
import type { BlockedAccountModel } from '@/lib/types';

/**
 * Pure row → display mapping for the Blocked Accounts table. No React, no
 * queries — so the rules below (what counts as expired, what an admin may do to
 * a row) are readable and testable in one place instead of scattered across
 * cells.
 */

/** Stable identity for a row. The RPC unions two sources, so neither id alone is unique. */
export function rowKey(row: BlockedAccountModel): string {
  return `${row.kind}:${row.email}:${row.portal ?? '-'}`;
}

export type LockState = {
  /** False once `locked_until` has passed — the row is stale, not active. */
  active: boolean;
  /** Whole minutes remaining, floored. Zero when not active. */
  minutesLeft: number;
};

/**
 * How much of the lockout is left.
 *
 * The list is a snapshot and lockouts expire on their own, so a row can be on
 * screen after it has already lifted. Saying so is the point: an admin who
 * cannot tell "locked for another 12 minutes" from "expired while you were
 * reading" will clear locks that needed no clearing.
 */
export function lockState(row: BlockedAccountModel, now: number = Date.now()): LockState {
  if (row.kind !== 'locked_out' || !row.locked_until) return { active: false, minutesLeft: 0 };
  const remainingMs = new Date(row.locked_until).getTime() - now;
  if (remainingMs <= 0) return { active: false, minutesLeft: 0 };
  return { active: true, minutesLeft: Math.floor(remainingMs / 60_000) };
}

/** Copy for the lock countdown. Sub-minute remainders read as "under a minute". */
export function lockLabel(state: LockState): string {
  if (!state.active) return 'Expired';
  if (state.minutesLeft < 1) return 'Under a minute';
  return `${state.minutesLeft} min left`;
}

export type DeviceInfo = {
  browser: string | null;
  os: string | null;
  device: ReturnType<typeof parseUserAgent>['device'];
  /** Single-line summary, e.g. "Chrome 141 · Windows 10/11". */
  summary: string | null;
};

export function deviceInfo(row: BlockedAccountModel): DeviceInfo {
  const { browser, os, device } = parseUserAgent(row.last_user_agent);
  const parts = [browser, os].filter(Boolean);
  return { browser, os, device, summary: parts.length ? parts.join(' · ') : null };
}

export type LocationInfo = { code: string | null; flag: string | null; label: string };

/**
 * Country only — never city. Rows captured before country was recorded, and
 * requests through a runtime with no Cloudflare edge, have none and say so
 * rather than guessing.
 */
export function locationInfo(row: BlockedAccountModel): LocationInfo {
  const code = row.last_country?.trim().toUpperCase() || null;
  return { code, flag: countryFlag(code), label: code ?? 'Unknown' };
}

/** Masked or full address, per the row's reveal state. */
export function ipDisplay(row: BlockedAccountModel, revealed: boolean): string {
  if (!row.last_ip) return '—';
  return revealed ? row.last_ip : (maskIp(row.last_ip) ?? '—');
}

/** Human label for the role mix, for the identity cell's second line. */
export function roleLabel(row: BlockedAccountModel): string | null {
  const keys = row.role_keys ?? [];
  if (!keys.length) return row.profile_id ? null : 'No account';
  if (keys.includes('vendor')) return 'Vendor';
  if (keys.includes('event_planner')) return 'Event Planner';
  if (keys.includes('client')) return 'Client';
  return 'Staff';
}

/**
 * Which actions make sense for this row.
 *
 * Encoded here rather than in the menu because the reasons are domain rules,
 * not layout: you cannot unlock a suspension (it never expires and was
 * deliberate), and you cannot email an address with no account behind it.
 */
export type RowCapabilities = {
  canUnlock: boolean;
  canEmail: boolean;
  canResendConfirmation: boolean;
};

export function capabilities(row: BlockedAccountModel): RowCapabilities {
  const hasAccount = Boolean(row.profile_id);
  return {
    canUnlock: row.kind === 'locked_out',
    canEmail: hasAccount,
    // Only a pending profile has an unconfirmed address to re-confirm.
    canResendConfirmation: hasAccount && row.account_status === 'pending',
  };
}
