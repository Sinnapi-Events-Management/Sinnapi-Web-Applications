/**
 * The browser half of the `portal-sign-in` contract, shared by all three
 * portals.
 *
 * The endpoint is one audited chokepoint for password sign-in across client,
 * vendor and admin; this is the one place that decides what its answers MEAN.
 * It used to be copied into each portal's `portalAccess.ts`, and the copies are
 * exactly where the defect below survived unnoticed in all three at once.
 *
 * TWO RULES, BOTH LEARNED THE HARD WAY
 *
 * 1. THE REQUEST IS ANONYMOUS, EXPLICITLY.
 *    `functions.invoke` attaches whatever session supabase-js has in storage.
 *    Signing in is by definition something you do WITHOUT a session, so that
 *    token is at best irrelevant — and at worst it is a token this project
 *    cannot verify, which the gateway rejects with 401 before the function is
 *    ever dispatched. That is not hypothetical: after the platform was migrated
 *    between Supabase projects, every portal still holding a session minted by
 *    the OLD project sent that stale JWT with its sign-in request and got back
 *    a gateway 401 — which rule 2 then rendered as "invalid email or password".
 *    Sign-in was impossible, and the audit trail was empty because the handler
 *    never ran. Pinning `Authorization` to the anon key makes the call immune:
 *    supabase-js only injects the session token when the header is absent.
 *
 * 2. A STATUS CODE IS NOT A VERDICT. THE BODY IS.
 *    `portal-sign-in` answers a credential refusal with 401 `invalid_credentials`
 *    and a spent captcha with 403 `captcha_failed` — but 401 and 403 are also
 *    what the gateway returns for a bad apikey, an unverifiable JWT or a
 *    project that does not host this function, none of which examined a
 *    password. Classifying on status alone tells a user whose credentials were
 *    never checked to go and reset a password that works perfectly, and hides a
 *    total sign-in outage behind the one message nobody investigates.
 *
 *    So a refusal is only believed when the body says so. Anything else is
 *    `unavailable`, and that is the safe default in both directions: it grants
 *    nobody anything, and an unrecognised failure is far more likely to be our
 *    infrastructure than a statement about the password. This mirrors
 *    `classifyAuthFailure` in the Edge Function itself, which draws the same
 *    line one layer down — the distinction was simply never carried up here.
 */

/** The three portals, spelled as the endpoint's `portal` field expects. */
export type PortalName = 'client' | 'vendor' | 'admin';

/** The success payload. The extras the endpoint sends are read by the caller. */
type SignInResponse = {
  session?: { access_token?: string; refresh_token?: string };
};

/**
 * Just enough of `SupabaseClient` to post to a function.
 *
 * Structural rather than the real type so this package keeps its dependency
 * footprint — it is imported by three apps and has no business pulling in
 * supabase-js to describe one method.
 */
export type FunctionsInvoker = {
  functions: {
    invoke<T>(
      name: string,
      options: { body: Record<string, unknown>; headers?: Record<string, string> },
    ): Promise<{ data: T | null; error: unknown }>;
  };
};

/**
 * What actually happened, with the three cases kept apart on purpose.
 *
 * `credentials` and `captcha` are verdicts the endpoint reached. `unavailable`
 * is everything else, and it carries a `detail` for the console rather than for
 * the user — the user gets one reassuring, retryable sentence either way.
 */
export type SignInOutcome =
  | { kind: 'success'; accessToken: string; refreshToken: string }
  | { kind: 'credentials' }
  | { kind: 'captcha' }
  | { kind: 'unavailable'; detail: string };

const SIGN_IN_FUNCTION = 'portal-sign-in';

/**
 * Read the `error` code out of a non-2xx response.
 *
 * supabase-js hands back the untouched `Response` on `FunctionsHttpError`, so
 * the body is still there to read. It is cloned anyway: a future version that
 * peeks at the body first would otherwise turn every refusal into a thrown
 * "body already consumed" and take sign-in down.
 *
 * Returns null when there is no readable JSON `error` — which includes the
 * gateway's own failures, since those bodies are not ours and do not use this
 * shape. Null therefore lands in `unavailable`, which is the point.
 */
async function readErrorCode(res: Response | undefined): Promise<string | null> {
  if (!res) return null;
  try {
    const body = await (typeof res.clone === 'function' ? res.clone() : res).json();
    const code = (body as { error?: unknown })?.error;
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

/**
 * Post one sign-in attempt and classify the answer.
 *
 * Never throws: every failure mode resolves to a `SignInOutcome`, because the
 * caller is a form that must always have something to render.
 */
export async function requestPortalSignIn(
  client: FunctionsInvoker,
  params: {
    portal: PortalName;
    email: string;
    password: string;
    captchaToken: string;
    /** This project's anon key — see rule 1 above. */
    anonKey: string;
  },
): Promise<SignInOutcome> {
  const { portal, email, password, captchaToken, anonKey } = params;

  const { data, error } = await client.functions.invoke<SignInResponse>(SIGN_IN_FUNCTION, {
    body: { email, password, portal, captchaToken },
    // Rule 1. supabase-js sets `Authorization` from the stored session only
    // when the header is missing, so naming it here keeps any stale, foreign or
    // expired token out of a request that must be anonymous.
    headers: { Authorization: `Bearer ${anonKey}` },
  });

  if (error) {
    const res = (error as { context?: Response }).context;
    const status = typeof res?.status === 'number' ? res.status : null;
    const code = await readErrorCode(res);

    // Rule 2: believed only because the body identifies itself as ours.
    if (status === 401 && code === 'invalid_credentials') return { kind: 'credentials' };
    if (status === 403 && code === 'captcha_failed') return { kind: 'captcha' };

    const detail = `portal=${portal} status=${status ?? 'none'} code=${code ?? 'none'}`;
    // Loud on purpose. This branch means the sign-in endpoint was not reached,
    // or answered with something that is not its own vocabulary, and the user
    // is about to be told only that we are "temporarily unavailable". Without
    // this line there is nothing anywhere to investigate: an attempt the
    // handler never ran is an attempt `portal_access_attempts` never sees.
    console.error(
      JSON.stringify({ level: 'error', message: 'portal_sign_in_unavailable', detail }),
    );
    return { kind: 'unavailable', detail };
  }

  const accessToken = data?.session?.access_token;
  const refreshToken = data?.session?.refresh_token;
  if (!accessToken || !refreshToken) {
    const detail = `portal=${portal} status=200 code=empty_session`;
    console.error(
      JSON.stringify({ level: 'error', message: 'portal_sign_in_unavailable', detail }),
    );
    return { kind: 'unavailable', detail };
  }

  return { kind: 'success', accessToken, refreshToken };
}
