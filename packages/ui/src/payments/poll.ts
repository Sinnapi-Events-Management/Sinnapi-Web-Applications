/**
 * How long, and how eagerly, a return page asks whether the money landed.
 *
 * The browser gets back from Pesapal before the IPN does, often by several
 * seconds and occasionally by much longer — the notification is a separate
 * server-to-server call that Pesapal retries on its own clock. So the page
 * asks quickly at first, when the answer is most likely to have just arrived,
 * then backs off, and after the budget it stops and says so honestly rather
 * than spinning. A realtime subscription on the same row runs alongside, so
 * the poll is the fallback for a dropped websocket, not the primary path.
 */
export const PAYMENT_POLL_BUDGET_MS = 30_000;

/** The wait before the next check, given how long we have been waiting. */
export function paymentPollDelay(elapsedMs: number): number {
  if (elapsedMs < 3_000) return 1_000;
  if (elapsedMs < 8_000) return 2_000;
  if (elapsedMs < 15_000) return 3_000;
  return 5_000;
}
