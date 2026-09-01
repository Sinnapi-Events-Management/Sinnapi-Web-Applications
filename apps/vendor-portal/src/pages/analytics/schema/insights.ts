import { halfPeriodDelta } from '@sinnapi/ui/analytics';
import { formatMoney } from '@/lib/config';
import type { DashboardModel } from '@/data/overview';
import type { AnalyticsModel } from './types';

/**
 * What the numbers on this page actually say.
 *
 * A chart states a fact; this states the finding and where to act on it. Every
 * rule below is derived from data already fetched — no extra read — and every
 * one is *falsifiable from the page itself*, so a vendor can always scroll down
 * and check the claim against the chart it came from.
 *
 * Three rules the whole file follows:
 *
 *   1. Never speak from too small a sample. Each rule states its own floor;
 *      "0% win rate" off a single answered quote is noise presented as a verdict.
 *   2. Never invent a comparison. Deltas come from `halfPeriodDelta` on a real
 *      series; where there is no previous period, the insight is a level, not a
 *      change.
 *   3. Attention before praise. A vendor opening this page has limited
 *      attention, and the thing that needs doing outranks the thing going well.
 */
export type InsightTone = 'positive' | 'attention' | 'neutral';

export type Insight = {
  key: string;
  tone: InsightTone;
  /** The finding, in one line. */
  headline: string;
  /** Why it matters, or what to do about it. */
  detail: string;
  action?: { label: string; to: string };
};

/** How many make it onto the strip. Beyond four, nothing is a priority. */
const MAX_INSIGHTS = 4;

// Attention first, then context, then praise — see rule 3 above.
const TONE_RANK: Record<InsightTone, number> = { attention: 0, neutral: 1, positive: 2 };

/** Minimum answered quotes before a win rate is a signal rather than noise. */
const WIN_RATE_FLOOR = 3;
/** Minimum bookings before a lead-time median is worth stating. */
const LEAD_TIME_FLOOR = 3;
/** Minimum clients before a repeat rate means anything. */
const REPEAT_FLOOR = 5;

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Quote turnaround — on a marketplace, the clock the vendor most controls. */
function speedInsights({ speed }: AnalyticsModel): Insight[] {
  if (speed.quoteMedianHours == null || speed.quotesPriced < 2) return [];

  if (speed.quoteMedianHours > 24) {
    return [
      {
        key: 'quote-speed-slow',
        tone: 'attention',
        headline: `You take ${speed.quoteLabel} to price a request`,
        detail:
          'Clients gathering quotes usually decide within a day or two. Answering faster is the cheapest way to win more of the same demand.',
        action: { label: 'Open quotations', to: '/quotations' },
      },
    ];
  }
  if (speed.quoteMedianHours <= 6) {
    return [
      {
        key: 'quote-speed-fast',
        tone: 'positive',
        headline: `You price a request in ${speed.quoteLabel}`,
        detail: `Across ${speed.quotesPriced.toLocaleString()} quotes this period — fast enough to reach most clients before they have finished shopping.`,
      },
    ];
  }
  return [];
}

function winRateInsights({ pipeline }: DashboardModel): Insight[] {
  const { winRate, quotesAnswered, quotesAccepted } = pipeline;
  if (winRate === null || quotesAnswered < WIN_RATE_FLOOR) return [];

  if (winRate < 0.25) {
    return [
      {
        key: 'win-rate-low',
        tone: 'attention',
        headline: `${pct(winRate)} of your answered quotes convert`,
        detail: `${quotesAccepted} of ${quotesAnswered} answered quotes became a booking. Check your package pricing against what the winning quotes looked like.`,
        action: { label: 'Review packages', to: '/packages' },
      },
    ];
  }
  if (winRate >= 0.5) {
    return [
      {
        key: 'win-rate-high',
        tone: 'positive',
        headline: `${pct(winRate)} of your answered quotes convert`,
        detail:
          'A win rate this high usually means there is room to raise prices without losing the work.',
      },
    ];
  }
  return [];
}

function reviewInsights({ reputation }: DashboardModel, { speed }: AnalyticsModel): Insight[] {
  if (reputation.unanswered > 0) {
    return [
      {
        key: 'reviews-unanswered',
        tone: 'attention',
        headline: `${reputation.unanswered} ${reputation.unanswered === 1 ? 'review is' : 'reviews are'} waiting on your reply`,
        detail:
          'A public response is the one part of your reputation you write yourself, and clients read it alongside the score.',
        action: { label: 'Answer reviews', to: '/reviews' },
      },
    ];
  }
  if (speed.replyRate !== null && speed.replyRate >= 0.9 && speed.published >= 3) {
    return [
      {
        key: 'reviews-answered',
        tone: 'positive',
        headline: `You have answered ${pct(speed.replyRate)} of your reviews`,
        detail: `${speed.replies} of ${speed.published} published reviews carry a response — visible on your public profile.`,
      },
    ];
  }
  return [];
}

function earningsInsights({ earnings }: DashboardModel): Insight[] {
  const out: Insight[] = [];

  // A level, not a change: custody is a live balance with no previous period.
  if (earnings.inEscrow > 0) {
    out.push({
      key: 'escrow-held',
      tone: 'neutral',
      headline: `${formatMoney(earnings.inEscrow)} is held in escrow for you`,
      detail: `Across ${earnings.escrowCount.toLocaleString()} funded ${earnings.escrowCount === 1 ? 'booking' : 'bookings'} — earned and safe, released as each job completes.`,
      action: { label: 'View escrow', to: '/escrow' },
    });
  }

  const delta = halfPeriodDelta(earnings.trend, 'earned');
  if (delta !== null && Math.abs(delta) >= 0.2) {
    out.push(
      delta > 0
        ? {
            key: 'earnings-up',
            tone: 'positive',
            headline: `Booked work is up ${pct(delta)} across this period`,
            detail:
              'Comparing the second half of the window against the first. Worth checking which service carried it, on the Clients & services tab.',
          }
        : {
            key: 'earnings-down',
            tone: 'attention',
            headline: `Booked work is down ${pct(Math.abs(delta))} across this period`,
            detail:
              'Comparing the second half of the window against the first. A quieter half is normal in a seasonal trade — check the twelve-month view before reading it as a decline.',
          },
    );
  }

  return out;
}

function clientInsights({ clients, leadTime, services }: AnalyticsModel): Insight[] {
  const out: Insight[] = [];

  if (clients.repeatRate !== null && clients.total >= REPEAT_FLOOR) {
    if (clients.repeatRate >= 0.25) {
      out.push({
        key: 'repeat-high',
        tone: 'positive',
        headline: `${pct(clients.repeatRate)} of your clients book you again`,
        detail: `${clients.repeat} of ${clients.total} clients have booked more than once — repeat work costs nothing to win.`,
      });
    } else if (clients.repeatRate < 0.1) {
      out.push({
        key: 'repeat-low',
        tone: 'attention',
        headline: 'Almost none of your clients book you twice',
        detail: `${clients.repeat} of ${clients.total} have come back. For most event work that is normal, but a follow-up after delivery is what turns a one-off into a second date.`,
      });
    }
  }

  if (leadTime.medianDays !== null && leadTime.sample >= LEAD_TIME_FLOOR) {
    if (leadTime.medianDays < 14) {
      out.push({
        key: 'lead-time-short',
        tone: 'attention',
        headline: `Clients book you only ${leadTime.headline}`,
        detail:
          'A short horizon makes staffing and stock hard to plan. An early-booking discount is the usual lever for pulling it out.',
        action: { label: 'Set up a discount', to: '/discounts' },
      });
    } else {
      out.push({
        key: 'lead-time',
        tone: 'neutral',
        headline: `Clients typically book you ${leadTime.headline}`,
        detail: `Measured across ${leadTime.sample.toLocaleString()} ${leadTime.sample === 1 ? 'booking' : 'bookings'} in this period — your planning horizon.`,
      });
    }
  }

  // Concentration risk. Only worth raising when there is a second service to
  // compare against — a vendor selling one thing is not concentrated, they are
  // specialised, and telling them otherwise is noise.
  const [lead] = services;
  if (services.length > 1 && lead && lead.share >= 0.6) {
    out.push({
      key: 'service-concentration',
      tone: 'neutral',
      headline: `${lead.name} is ${pct(lead.share)} of your booked work`,
      detail: 'Most of your income depends on one service. Worth knowing when demand for it moves.',
    });
  }

  return out;
}

/**
 * The strip above the tabs. Both models are optional so the page can render the
 * strip's skeleton from the same call site while either read is still in flight.
 */
export function buildInsights(
  overview: DashboardModel | undefined,
  detail: AnalyticsModel | undefined,
): Insight[] {
  if (!overview || !detail) return [];

  return [
    ...winRateInsights(overview),
    ...speedInsights(detail),
    ...reviewInsights(overview, detail),
    ...earningsInsights(overview),
    ...clientInsights(detail),
  ]
    .sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone])
    .slice(0, MAX_INSIGHTS);
}
