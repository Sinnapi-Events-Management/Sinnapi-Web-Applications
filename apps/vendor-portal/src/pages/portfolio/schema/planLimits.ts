import type { PlanModel } from '@/lib/types';

/**
 * What the vendor's plan allows their portfolio to hold.
 *
 * These are the same two features `tg_enforce_media_limit` reads before it lets
 * an insert through, resolved on the client for one reason only: so the ceiling
 * is *shown* before it is *hit*. The trigger stays the authority — a client-side
 * count can be stale, and a vendor with two tabs open could still race past it —
 * so nothing here is a substitute for handling the refusal (see `mediaErrors`).
 * It exists to keep the vendor from spending five minutes picking photos they
 * are not allowed to add.
 */

/** `max_portfolio_images` uses -1 for "no cap", matching the seed data. */
const UNLIMITED = -1;

export type PortfolioLimits = {
  /** Image cap, or null when the plan sets none (or none could be read). */
  maxImages: number | null;
  allowsVideo: boolean;
  planName: string | null;
};

/** Neutral defaults: allow everything, and let the trigger have the last word. */
const UNRESTRICTED: PortfolioLimits = { maxImages: null, allowsVideo: true, planName: null };

/**
 * `plan_features.value` is jsonb, so PostgREST hands back a real number or
 * boolean — but the generated row type widens it to `string | boolean | null`,
 * and a plan seeded with a quoted value would arrive as a string. Both shapes are
 * read rather than trusting one.
 */
function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === 'true') return true;
    if (text === 'false') return false;
  }
  return null;
}

/**
 * The caps for `planId`, or the unrestricted defaults when the plan list hasn't
 * loaded or the vendor has no subscription row yet. Defaulting *open* is
 * deliberate: showing "video not included" to a vendor whose plans query is
 * merely still in flight would be a lie, and the trigger will refuse anything
 * that genuinely isn't allowed.
 */
export function readPortfolioLimits(
  plans: PlanModel[] | undefined,
  planId: string | null | undefined,
): PortfolioLimits {
  const plan = planId ? plans?.find((p) => p.id === planId) : undefined;
  if (!plan) return UNRESTRICTED;

  const features = plan.plan_features ?? [];
  const max = readNumber(features.find((f) => f.feature_key === 'max_portfolio_images')?.value);
  const video = readBoolean(features.find((f) => f.feature_key === 'portfolio_video')?.value);

  return {
    maxImages: max === null || max === UNLIMITED || max < 0 ? null : max,
    allowsVideo: video ?? true,
    planName: plan.name,
  };
}

/** How many images may still be added, or null when the plan sets no cap. */
export function remainingImages(limits: PortfolioLimits, imageCount: number): number | null {
  return limits.maxImages === null ? null : Math.max(0, limits.maxImages - imageCount);
}
