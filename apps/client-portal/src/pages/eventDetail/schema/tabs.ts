/**
 * The event page's sections, mirrored into the URL (`/my-events/:id?tab=plan`).
 *
 * Split by the question being asked, not by data source: "what is this event"
 * (overview), "what do I still need and what have I set aside for it" (plan),
 * "who can do it and what are they charging" (vendors).
 *
 * Overview leads because it answers the question someone opening an event
 * usually has, and it is the default — represented by the ABSENCE of the
 * parameter, so `/my-events/:id` stays canonical and adding a section later can
 * never re-point an existing link.
 */
export const EVENT_TABS = ['overview', 'plan', 'vendors'] as const;

export type EventTab = (typeof EVENT_TABS)[number];
