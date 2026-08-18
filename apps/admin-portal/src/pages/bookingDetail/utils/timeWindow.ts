/**
 * A booking's optional time window, rendered for display.
 *
 * `start_time`/`end_time` are Postgres `time` columns, so they arrive as
 * "14:00:00" — seconds a booking never carries any meaning in. Either end may be
 * absent: "from 14:00, open-ended" is a real request the RPC accepts, and so is
 * a bare date with no window at all.
 */
function hhmm(value: string): string {
  return value.slice(0, 5);
}

/** `null` when neither end is set — the caller then omits the row entirely. */
export function formatTimeWindow(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (start && end) return `${hhmm(start)} – ${hhmm(end)}`;
  if (start) return `From ${hhmm(start)}`;
  if (end) return `Until ${hhmm(end)}`;
  return null;
}
