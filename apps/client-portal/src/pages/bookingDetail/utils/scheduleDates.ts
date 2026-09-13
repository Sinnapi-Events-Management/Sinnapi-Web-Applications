/**
 * A release date as the client reads it — "23 September 2026" — or null when
 * there is no usable date, so callers leave the date out rather than print
 * "Invalid Date".
 */
export function formatReleaseDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "23 September 2026 · 7 days before your event", with either half optional. */
export function releaseWhen(dueLabel: string | null, daysBefore: number | null): string | null {
  const days =
    daysBefore != null && daysBefore > 0
      ? `${daysBefore} ${daysBefore === 1 ? 'day' : 'days'} before your event`
      : null;
  return [dueLabel, days].filter(Boolean).join(' · ') || null;
}
