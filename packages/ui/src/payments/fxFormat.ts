/**
 * The small, pure formatting rules behind the FX confirmation step. Kept out
 * of the components so the countdown hook and the lines that print it agree
 * on what "expired" and "held for 4:59" mean.
 */

export function secondsUntil(iso: string | null): number {
  if (!iso) return 0;
  const ms = Date.parse(iso) - Date.now();
  return ms > 0 ? Math.floor(ms / 1000) : 0;
}

export function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPercent(rate: number): string {
  const pct = rate * 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

/** Deliberately plain-spoken: "3 hours ago" reads truer than a timestamp. */
export function relativeAge(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (!Number.isFinite(seconds)) return 'recently';
  if (seconds < 90) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
