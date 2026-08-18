import { formatClockTime, formatDayLabel } from '../messaging/format';

/**
 * Absolute stamp for the detail pane — "Yesterday at 14:32".
 *
 * Composed from the messaging kit's two formatters rather than a third
 * `toLocaleString` call, so a notification and a message that arrived in the
 * same minute always read as the same moment. The relative stamp on the row
 * answers "how long ago"; this answers "exactly when", which is the question
 * someone has once they have opened the thing.
 */
export function formatNotificationTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const day = formatDayLabel(value);
  const time = formatClockTime(value);
  if (day === 'Unknown date' || !time) return '—';
  return `${day} at ${time}`;
}
