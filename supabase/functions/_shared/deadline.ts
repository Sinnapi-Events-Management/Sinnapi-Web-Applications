// deadline — nothing in a payment path waits forever.
//
// WHY THIS EXISTS
// `create-payment` burned the Edge runtime's entire wall-clock budget (~150s
// on the free plan, 400s on paid) on a single outbound call to PayPal and then
// died without answering. The payer saw `upstream request timeout`: no reason,
// no retry advice, and — because the function never reached its own error
// handling — a `payments` row left pending, holding the one-checkout-at-a-time
// guard against the next attempt.
//
// The call already had `AbortSignal.timeout(12_000)` on it. It did not help.
// That is the lesson this module encodes: an abort signal is a REQUEST to stop,
// honoured only if the runtime's network layer is in a state to honour it. A
// connection stalled before the response headers arrive can ignore it, and did.
// So every deadline here is enforced twice:
//
//   1. cooperatively, by passing a real `AbortSignal` to `fetch` or to
//      supabase-js's `.abortSignal()`, which is what actually frees the socket
//      or the database connection when it works; and
//   2. unconditionally, by racing the whole thing against a timer, so the
//      caller gets control back at the stated moment whether or not the abort
//      landed.
//
// The second half is what makes the promise "this function always answers"
// true rather than aspirational. A leaked socket is a cost worth paying for
// it: the isolate is torn down shortly afterwards regardless, whereas a payer
// staring at a dead spinner for two and a half minutes is the failure we are
// actually here to prevent.
//
// WHY A BUDGET AND NOT JUST PER-CALL TIMEOUTS
// `create-payment` makes eight sequential round trips. Eight individually
// reasonable timeouts multiply into something far past any limit worth having,
// so the per-call caps are clamped by what is left of ONE request-wide budget.
// That budget is deliberately set below the browser's own timeout, so the
// server is always the one that names the failure.

/** A call, or the whole request, ran past the time it was given. */
export class DeadlineError extends Error {
  constructor(
    /** Which call. Used verbatim as the reason recorded against the payment. */
    public readonly label: string,
    public readonly ms: number,
  ) {
    super(`deadline_exceeded: ${label} did not finish within ${ms}ms`);
    this.name = 'DeadlineError';
  }
}

export type Budget = {
  /** Milliseconds left. Zero once spent. */
  remaining(): number;
  /** Milliseconds used so far — for the log line, not for control flow. */
  spent(): number;
  /**
   * What to allow one call, given what it would like and what is left.
   *
   * Returns 0 when the budget is gone, which callers MUST treat as "stop" —
   * a zero-millisecond deadline would otherwise reject after doing the work
   * anyway, which is the worst of both.
   */
  allow(wantMs: number): number;
};

/** Start a request-wide budget. */
export function budget(totalMs: number): Budget {
  const started = Date.now();
  const spent = () => Date.now() - started;
  const remaining = () => Math.max(0, totalMs - spent());
  return { remaining, spent, allow: (wantMs) => Math.min(wantMs, remaining()) };
}

/**
 * Run something with a hard deadline.
 *
 * `run` is handed an `AbortSignal` and should pass it on — to `fetch`, or to
 * supabase-js's `.abortSignal()`. Both layers of enforcement are described in
 * the header; the short version is that the signal is the polite request and
 * the race is the guarantee.
 *
 * Accepts a `PromiseLike` rather than a `Promise` because a PostgREST query
 * builder is a thenable, not a promise, and `.abortSignal(signal)` has to be
 * called on the builder — so the call site needs to hand the builder straight
 * back without awaiting it first.
 */
export async function withDeadline<T>(
  label: string,
  ms: number,
  run: (signal: AbortSignal) => PromiseLike<T>,
): Promise<T> {
  if (ms <= 0) throw new DeadlineError(label, 0);

  const controller = new AbortController();
  // `ReturnType` rather than `number`: the handle is a number in the browser
  // and an object under Node's typings, and this file is checked by both.
  let timer: ReturnType<typeof setTimeout> | undefined;

  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Ask first — this is what frees the socket or the connection when the
      // runtime is in a position to do it.
      controller.abort(new DeadlineError(label, ms));
      reject(new DeadlineError(label, ms));
    }, ms);
  });

  try {
    return await Promise.race([Promise.resolve(run(controller.signal)), expiry]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * `fetch` that cannot outlive its deadline.
 *
 * The body is read INSIDE the deadline, which the previous code did not do:
 * `await fetch(...)` resolves as soon as the response headers arrive, so a
 * provider that sends headers and then stalls mid-body escaped the timeout
 * entirely. Worse, the abort then surfaced from `res.json()` — outside the
 * wrapper, where a `.catch(() => ({}))` at the call site silently turned a
 * timed-out response into an empty object and the code carried on with it.
 *
 * Returns the status and the parsed body together so no caller can repeat that
 * mistake: by the time this returns, there is nothing left to await.
 */
export async function fetchJson(
  label: string,
  ms: number,
  url: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; body: unknown; text: string }> {
  return await withDeadline(label, ms, async (signal) => {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal });
    } catch (e) {
      if (e instanceof DeadlineError) throw e;
      // DNS failure, TLS failure, connection refused or reset — the request
      // never arrived, which is why nothing shows in the provider's dashboard.
      throw new Error(`unreachable: ${e instanceof Error ? e.message : 'fetch_failed'}`);
    }

    // Read as text, then parse. A provider erroring with an HTML page is a
    // thing that happens, and `res.json()` on it throws a parse error that
    // says nothing about the status code that actually explains the failure.
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body, text };
  });
}
