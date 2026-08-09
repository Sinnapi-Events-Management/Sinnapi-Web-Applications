/**
 * Time-of-day helpers for `TimeField`.
 *
 * The wire format is `HH:mm` on a 24-hour clock, which is exactly what Postgres
 * `time` columns accept (`bookings.start_time`, `vendor_availability.start_time`)
 * — so a value can go from the picker to the database with no reformatting.
 *
 * Display is 24-hour too, matching the East-Africa convention the rest of the
 * product uses. Pure data: no React, no date library.
 */

/** A time of day, `HH:mm` on a 24-hour clock. The empty string means "not set". */
export type IsoTime = string;

const ISO_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const MINUTES_PER_DAY = 24 * 60;

export function isIsoTime(value: unknown): value is IsoTime {
  return typeof value === 'string' && ISO_TIME_RE.test(value);
}

/** `HH:mm` → minutes since midnight, or `null` when it isn't a time. */
export function toMinutes(value: IsoTime | null | undefined): number | null {
  if (!isIsoTime(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Minutes since midnight → `HH:mm`. Values outside the day are clamped. */
export function fromMinutes(minutes: number): IsoTime {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.round(minutes)));
  const hours = `${Math.floor(clamped / 60)}`.padStart(2, '0');
  return `${hours}:${`${clamped % 60}`.padStart(2, '0')}`;
}

/**
 * Every selectable slot for a picker, as `HH:mm`.
 *
 * `step` is the granularity in minutes; `min`/`max` narrow the day so an end
 * time can be constrained to after its start without the caller filtering the
 * list itself.
 */
export function timeSlots(step: number, min?: IsoTime, max?: IsoTime): IsoTime[] {
  const size = Math.max(1, Math.round(step));
  const floor = toMinutes(min) ?? 0;
  const ceiling = toMinutes(max) ?? MINUTES_PER_DAY - 1;
  const slots: IsoTime[] = [];
  // Start at the first step boundary at or after `floor` so a 14:05 minimum with
  // a 15-minute step offers 14:15, not a stray 14:05.
  for (let m = Math.ceil(floor / size) * size; m <= ceiling; m += size) slots.push(fromMinutes(m));
  return slots;
}

/**
 * Best-effort parse of what someone typed: `9`, `9:5`, `0930`, `9.30`, `21:15`.
 * Returns `''` when it can't be read as a time, so the caller can keep the raw
 * text and let validation speak.
 */
export function parseTimeInput(input: string): IsoTime {
  const digits = input.trim().replace(/[^\d]/g, '');
  if (!digits) return '';
  let hours: number;
  let minutes: number;
  if (digits.length <= 2) {
    hours = Number(digits);
    minutes = 0;
  } else if (digits.length === 3) {
    hours = Number(digits.slice(0, 1));
    minutes = Number(digits.slice(1));
  } else {
    hours = Number(digits.slice(0, 2));
    minutes = Number(digits.slice(2, 4));
  }
  if (hours > 23 || minutes > 59) return '';
  return fromMinutes(hours * 60 + minutes);
}

/** How long a slot lasts, in minutes — `null` unless both ends are real times. */
export function durationMinutes(start: IsoTime, end: IsoTime): number | null {
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from === null || to === null) return null;
  return to - from;
}
