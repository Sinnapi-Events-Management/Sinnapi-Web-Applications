/**
 * Curated event-planning tips shown on the events listing and event detail
 * pages. A single blended set spanning three audiences — couples & hosts
 * planning **in Uganda**, **Ugandans in the diaspora** organising from abroad,
 * and **international** best practice — so the same advice serves every visitor.
 *
 * Kept in the organism's `data/` layer as pure data (no JSX): each tip names an
 * `icon` token that `TipCard` maps to a Material icon, so this file stays a
 * plain `.ts` source of truth that both the selector and presentation read.
 *
 * Sources informing the local & diaspora guidance:
 *   - Harusi Hub / Palm Gardens — 2026 Uganda wedding budget guides
 *   - Rennie Concepts — budget tips from a Ugandan wedding planner
 *   - Eyalama Travel / My Wedding UG — intro (kwanjula) & destination weddings
 *   - zkipster / Wild Apricot — international event-planning checklists
 */

/** Who a tip speaks to most directly (every tip still helps everyone). */
export type TipAudience = 'local' | 'diaspora' | 'international';

/** Icon token → mapped to a Material icon in `TipCard` (keeps data JSX-free). */
export type TipIcon =
  | 'budget'
  | 'calendar'
  | 'planner'
  | 'guests'
  | 'food'
  | 'forex'
  | 'trip'
  | 'family'
  | 'ceremony'
  | 'mc'
  | 'runOfShow'
  | 'contract'
  | 'contingency'
  | 'regional';

export type EventTip = {
  id: string;
  icon: TipIcon;
  title: string;
  body: string;
  audience: TipAudience;
  /**
   * Occasion tokens (matching the DB `event_type`) this tip is most relevant to.
   * Omitted = broadly applicable; the selector surfaces type matches first.
   */
  eventTypes?: string[];
};

/** Short chip copy per audience — frames each tip without a wall of labels. */
export const AUDIENCE_LABELS: Record<TipAudience, string> = {
  local: 'In Uganda',
  diaspora: 'From abroad',
  international: 'Best practice',
};

/**
 * The curated tips. Order matters: the first entries are the strongest
 * cross-audience advice, so the listing page (which slices the top N) always
 * leads with broadly useful tips. The detail page re-ranks occasion matches
 * first via `selectEventTips`.
 */
export const EVENT_TIPS: EventTip[] = [
  {
    id: 'budget-first',
    icon: 'budget',
    title: 'Set the budget before the guest list',
    body: 'Agree the total first, then size every decision to it. Food usually takes the largest share and scales directly with how many people you invite.',
    audience: 'international',
  },
  {
    id: 'book-early',
    icon: 'calendar',
    title: 'Lock venues and top vendors early',
    body: 'The best venues and caterers go months ahead — plan 9–18 months out for a wedding or large event so dates and key suppliers are secured.',
    audience: 'local',
  },
  {
    id: 'local-planner',
    icon: 'planner',
    title: 'Appoint a planner on the ground',
    body: 'Planning from abroad? A trusted local planner knows credible vendors and fair prices, handles site visits, and keeps things moving while you focus on the day.',
    audience: 'diaspora',
  },
  {
    id: 'guest-list',
    icon: 'guests',
    title: 'Size the guest list to the venue',
    body: 'Set the capacity first, then build the list to fit it. In Uganda expect the final count to exceed the invite list — plan a comfortable buffer.',
    audience: 'international',
  },
  {
    id: 'food-is-king',
    icon: 'food',
    title: 'Plan food generously — and serve it on time',
    body: 'Events are remembered by the catering. Order enough, confirm the menu, and brief the team so food is hot and served promptly, not hours late.',
    audience: 'local',
    eventTypes: ['wedding', 'anniversary', 'graduation', 'baby_shower', 'birthday'],
  },
  {
    id: 'forex',
    icon: 'forex',
    title: 'Budget for forex and transfer fees',
    body: 'Sending money home adds up. Factor in exchange rates and transfer charges, and pay deposits early to lock prices before the season pushes them up.',
    audience: 'diaspora',
  },
  {
    id: 'two-ceremonies',
    icon: 'ceremony',
    title: 'Budget for the kwanjula and the wedding',
    body: 'A Ugandan wedding is several events, not one. The introduction (kwanjula) can cost as much as the church day — plan both as separate budgets from the start.',
    audience: 'local',
    eventTypes: ['wedding', 'anniversary'],
  },
  {
    id: 'time-your-trip',
    icon: 'trip',
    title: 'Time your trip around the milestones',
    body: 'Arrive in time for the decisions that need you in person — final tastings, fittings and venue walk-throughs — and give guests 6–12 months’ notice to travel.',
    audience: 'diaspora',
    eventTypes: ['wedding', 'anniversary', 'graduation'],
  },
  {
    id: 'contingency',
    icon: 'contingency',
    title: 'Keep a contingency of ~10%',
    body: 'Last-minute extras are normal — more guests, an added tent, a power backup. A small reserve keeps a surprise from derailing the whole budget.',
    audience: 'international',
  },
  {
    id: 'get-it-in-writing',
    icon: 'contract',
    title: 'Confirm every vendor in writing',
    body: 'Put deliverables, timings and the full price in a written agreement. It prevents day-of surprises and gives you a clear reference if plans change.',
    audience: 'international',
  },
  {
    id: 'trusted-family',
    icon: 'family',
    title: 'Give trusted family clear roles',
    body: 'Assign specific responsibilities — payments, logistics, guest liaison — to people you trust at home, with one point of contact so messages do not get lost.',
    audience: 'diaspora',
  },
  {
    id: 'hire-mc',
    icon: 'mc',
    title: 'Hire a professional MC',
    body: 'A great master of ceremonies keeps the programme flowing, reads the room, works in multiple languages and quietly handles the hiccups guests never see.',
    audience: 'local',
    eventTypes: ['wedding', 'graduation', 'anniversary', 'corporate'],
  },
  {
    id: 'run-of-show',
    icon: 'runOfShow',
    title: 'Build a detailed run-of-show',
    body: 'Map the agenda minute by minute and share it with every supplier. A clear timeline keeps speakers, AV and catering in sync from doors open to close.',
    audience: 'international',
    eventTypes: ['corporate', 'conference', 'product_launch', 'concert'],
  },
  {
    id: 'go-regional',
    icon: 'regional',
    title: 'Going regional can cut costs',
    body: 'Venues and services in towns outside Kampala can run 20–40% lower. If your guests can travel, a regional setting stretches the same budget further.',
    audience: 'local',
  },
];

/**
 * Pick the tips to render. With an `eventType`, occasion-matched tips lead and
 * the rest follow in curated order; without one (the listing page), returns the
 * top blend. Always capped at `limit` for a tidy, even grid.
 */
export function selectEventTips(eventType?: string | null, limit = 6): EventTip[] {
  if (!eventType) return EVENT_TIPS.slice(0, limit);

  const matches = EVENT_TIPS.filter((tip) => tip.eventTypes?.includes(eventType));
  const rest = EVENT_TIPS.filter((tip) => !tip.eventTypes?.includes(eventType));
  return [...matches, ...rest].slice(0, limit);
}
