import { z } from 'zod';
import { optionalDateField } from '@/lib/schema';

export const eventFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Event title must be at least 3 characters.')
    .max(140, 'Event title must be 140 characters or fewer.'),
  event_type: z.string().trim().max(60, 'Event type must be 60 characters or fewer.'),
  event_date: optionalDateField('event date'),
  location: z.string().trim().max(160, 'Location must be 160 characters or fewer.'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const emptyEventValues: EventFormValues = {
  title: '',
  event_type: '',
  event_date: '',
  location: '',
  description: '',
};

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());

/**
 * The `events` row for a client-posted event. Optional fields collapse to null
 * rather than empty strings so "not provided" reads the same in the database as
 * it does everywhere else.
 */
export function toEventInsert(values: EventFormValues, userId: string) {
  return {
    posted_by: userId,
    source: 'client',
    title: values.title.trim(),
    description: nullIfEmpty(values.description),
    event_type: nullIfEmpty(values.event_type),
    event_date: nullIfEmpty(values.event_date),
    location: nullIfEmpty(values.location),
    status: 'published',
    is_public: true,
  };
}
