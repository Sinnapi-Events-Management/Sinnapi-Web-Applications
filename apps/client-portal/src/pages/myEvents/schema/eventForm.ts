import { z } from 'zod';
import { optionalDateField } from '@/lib/schema';
import { BLANK_BUDGET, checkBudgetRange, eventBudgetShape, toBudgetColumns } from './eventBudget';

/**
 * The editable shape of a client-posted event.
 *
 * Every field is a string so the form stays uncontrolled-friendly and the
 * resolver's input and output types match; nulls are reconstructed by
 * `toInsertPayload` on save. Status, visibility and source are absent on
 * purpose — a client event is always a public, published, client-sourced row,
 * so those are decided by the payload builder rather than by the user.
 *
 * The budget fields are merged in from `eventBudget` rather than restated: the
 * payment-terms dialog edits the same three columns, and a client who states a
 * budget while posting should get exactly the same rules as one who adds it
 * afterwards.
 */
export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Event title must be at least 3 characters.')
      .max(140, 'Event title must be 140 characters or fewer.'),
    // A row id from `event_types`, or '' for "not specified". The occasion used
    // to be free text, which meant a client's event never matched the occasion
    // facets vendors and the public site browse by; it is now chosen from the
    // vocabulary an admin manages, so the select is the only way to set it and
    // this only has to reject a value that never came from it.
    event_type_id: z.union([z.literal(''), z.string().uuid('Choose an event type.')]),
    event_date: optionalDateField('event date'),
    location: z.string().trim().max(160, 'Location must be 160 characters or fewer.'),
    description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
    ...eventBudgetShape,
  })
  .superRefine(checkBudgetRange);

export type EventFormValues = z.infer<typeof eventFormSchema>;

/** Blank form for the create drawer. */
export const BLANK_EVENT: EventFormValues = {
  title: '',
  event_type_id: '',
  event_date: '',
  location: '',
  description: '',
  ...BLANK_BUDGET,
};

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());

/**
 * The `events` row for a client-posted event. Optional fields collapse to null
 * rather than empty strings so "not provided" reads the same in the database as
 * it does everywhere else. `postedBy` is the acting client, which the insert's
 * RLS policy also checks against `auth.uid()`.
 */
export function toInsertPayload(values: EventFormValues, opts: { postedBy: string }) {
  return {
    posted_by: opts.postedBy,
    source: 'client',
    title: values.title.trim(),
    description: nullIfEmpty(values.description),
    event_type_id: nullIfEmpty(values.event_type_id),
    event_date: nullIfEmpty(values.event_date),
    location: nullIfEmpty(values.location),
    ...toBudgetColumns(values),
    status: 'published',
    is_public: true,
  };
}
