import type { EventStatus } from '@/lib/status';

/** A status the current event may move to, plus how the row menu labels it. */
export type EventTransition = {
  to: EventStatus;
  /** Verb-first menu label, e.g. "Publish event". */
  label: string;
  /** Tints the menu item so destructive/positive moves read at a glance. */
  tone: 'success' | 'warning' | 'neutral';
};

// The event lifecycle graph, expressed as the moves offered from each status.
// Any status can still be set to any other from the edit drawer's select; these
// are just the one-click transitions surfaced on the row.
const TRANSITIONS: Record<EventStatus, EventTransition[]> = {
  draft: [
    { to: 'published', label: 'Publish event', tone: 'success' },
    { to: 'archived', label: 'Archive event', tone: 'neutral' },
  ],
  published: [
    { to: 'closed', label: 'Close event', tone: 'warning' },
    { to: 'archived', label: 'Archive event', tone: 'neutral' },
  ],
  closed: [
    { to: 'published', label: 'Republish event', tone: 'success' },
    { to: 'archived', label: 'Archive event', tone: 'neutral' },
  ],
  archived: [{ to: 'draft', label: 'Restore to draft', tone: 'neutral' }],
};

/** One-click status moves for an event in `current` status; `[]` if unknown. */
export function getStatusTransitions(current: string): EventTransition[] {
  return TRANSITIONS[current as EventStatus] ?? [];
}
