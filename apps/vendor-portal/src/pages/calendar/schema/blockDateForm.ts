/**
 * What blocking time off is, as data.
 *
 * A vendor blocks a day for a dentist appointment and a fortnight for a
 * holiday, and the second is not the first repeated fourteen times by hand — so
 * the form carries a mode, and a range expands here rather than in the hook
 * that submits it. Everything below is pure: the expansion, the days it refuses
 * to touch, and the sentence describing what it did.
 */
import { z } from 'zod';
import { addDays, compareIso, parseIsoDate, toIsoDate } from '@sinnapi/ui';
import { optionalDateField, requiredDateField } from '@/lib/schema';

export type BlockMode = 'single' | 'range';

/**
 * The longest range one submit may cover.
 *
 * A year off is a real thing a vendor does; a decade is a mis-drag on a picker.
 * The cap is what stands between the two, and it is enforced in the schema so
 * the message lands on the field rather than as a failed insert.
 */
export const MAX_BLOCK_RANGE_DAYS = 366;

/** Inclusive day count between two ISO dates. `1` when they are the same day. */
function spanInDays(from: string, to: string): number {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return 0;
  // Rounded, not floored: a DST boundary inside the range makes one of these
  // days 23 or 25 hours long, which would otherwise lose or gain a day.
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export const blockDateFormSchema = z
  .object({
    mode: z.enum(['single', 'range']),
    blocked_date: requiredDateField('Date'),
    /** Only meaningful in `range` mode; ignored, not cleared, in `single`. */
    end_date: optionalDateField('end date'),
    reason: z.string().trim().max(200, 'Reason must be 200 characters or fewer.'),
  })
  // The end date's rules depend on the mode, so they cannot live on the field:
  // in `single` mode a blank end is correct, and in `range` mode it is the one
  // thing missing.
  .superRefine((values, ctx) => {
    if (values.mode !== 'range') return;

    if (!values.end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: 'Choose the last day of the range.',
      });
      return;
    }

    const span = spanInDays(values.blocked_date, values.end_date);
    if (span < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: 'The range has to end on or after it starts.',
      });
    } else if (span > MAX_BLOCK_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: `Block at most ${MAX_BLOCK_RANGE_DAYS} days at a time.`,
      });
    }
  });

export type BlockDateFormValues = z.infer<typeof blockDateFormSchema>;

/** The form as it opens: whatever day the grid has, one day long, no reason. */
export function blockDateDefaults(date: string): BlockDateFormValues {
  return { mode: 'single', blocked_date: date, end_date: '', reason: '' };
}

/** Every date the chosen mode covers, inclusive of both ends. */
export function expandBlockDates(values: BlockDateFormValues): string[] {
  if (values.mode === 'single' || !values.end_date) return [values.blocked_date];

  const dates: string[] = [];
  let cursor = parseIsoDate(values.blocked_date);
  // Bounded by the schema's own cap as well as by the end date: the loop must
  // terminate even if it is ever called on values that never passed validation.
  while (cursor && dates.length < MAX_BLOCK_RANGE_DAYS) {
    const iso = toIsoDate(cursor);
    if (compareIso(iso, values.end_date) > 0) break;
    dates.push(iso);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

/** One `vendor_blocked_dates` row for a manual block. */
type BlockedDateInsert = {
  vendor_id: string;
  blocked_date: string;
  reason: string | null;
  source: 'manual';
};

export type BlockPlan = {
  rows: BlockedDateInsert[];
  /** Days inside the range that were left alone rather than written. */
  skipped: number;
};

/**
 * The rows a submit should actually write.
 *
 * Two kinds of day are dropped rather than written. A day already spoken for —
 * by a booking or by an earlier block — because `(vendor, date, source)` is
 * unique and a duplicate would fail the whole insert, taking the other thirteen
 * days of a holiday with it. And a day already gone, because the grid refuses
 * to select one and a range dragged backwards should not sneak one in.
 *
 * `source: 'manual'` is what separates these from the rows a confirmed booking
 * inserts — only manual ones can be removed from this page, and RLS enforces it.
 */
export function planBlockInserts(
  values: BlockDateFormValues,
  vendorId: string,
  unavailable: ReadonlySet<string>,
  today: string,
): BlockPlan {
  const dates = expandBlockDates(values);
  const reason = values.reason.trim() || null;
  const usable = dates.filter((date) => compareIso(date, today) >= 0 && !unavailable.has(date));

  return {
    rows: usable.map((date) => ({
      vendor_id: vendorId,
      blocked_date: date,
      reason,
      source: 'manual' as const,
    })),
    skipped: dates.length - usable.length,
  };
}

/** What just happened, in a sentence the page can show back. */
export function describeBlockOutcome({ rows, skipped }: BlockPlan): string {
  const blocked = rows.length === 1 ? '1 day blocked.' : `${rows.length} days blocked.`;
  if (skipped === 0) return blocked;
  const left =
    skipped === 1
      ? '1 day was already booked or blocked, and was left as it was.'
      : `${skipped} days were already booked or blocked, and were left as they were.`;
  return `${blocked} ${left}`;
}
