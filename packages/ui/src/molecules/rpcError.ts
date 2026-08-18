/**
 * Reading a failed write the way the server actually hands it back.
 *
 * WHY THIS EXISTS
 * `supabase.rpc()` does not reject and does not return an `Error`. It resolves
 * with `{ data, error }`, and that `error` is a **plain object**:
 *
 *   { code: '42804', message: 'column "status" is of type …', details, hint }
 *
 * Three call sites had independently written `error instanceof Error ?
 * error.message : String(error)`, which is exactly wrong for that shape: the
 * instanceof is false, so `String({...})` runs and the user is shown
 * `[object Object]`. It is the one input the ternary cannot survive and the one
 * input it will always be given.
 *
 * WHAT ELSE IT HAS TO DO
 * Getting the string out is half the job. The other half is deciding whether
 * the person in front of the screen should see it. Our RPCs raise their own
 * refusals as bare tokens (`quotation_not_answerable`) with SQLSTATE `P0001`,
 * and those are written to be translated into a sentence. Everything else —
 * `42804` type errors, `42P01` missing tables, deadlocks, an expired JWT — is
 * either a bug or an infrastructure state. Passing those through, as the old
 * mappers' `return raw` did, puts `column "status" is of type quotation_status
 * but expression is of type text` in a dialog, which tells the client nothing
 * they can act on and tells anyone else reading over their shoulder more about
 * our schema than they should have.
 *
 * So: the SQLSTATE decides the *class* of failure, and the class decides
 * whether the server's own words are shown, a standard sentence is shown, or
 * the domain's token table gets to answer.
 */

/** plpgsql `raise exception 'token'` — every guard in our RPCs lands here. */
const RAISE_EXCEPTION = 'P0001';

/** `_forbidden()` raises with this, and RLS refusals arrive with it too. */
const INSUFFICIENT_PRIVILEGE = '42501';

/** Serialization failure and deadlock: nobody's fault, worth retrying. */
const CONTENTION = new Set(['40001', '40P01', '55P03']);

/** PostgREST's own codes for a session that is no longer good. */
const SESSION = new Set(['PGRST301', 'PGRST302', '401']);

/** Wording used when the server's own message must not be shown. */
export const RPC_ERROR_COPY = {
  fallback: 'Something went wrong. Please try again.',
  internal:
    'Something went wrong on our side and this change was not saved. Please try again — if it ' +
    'keeps happening, contact support.',
  offline: 'You appear to be offline. Check your connection and try again.',
  session: 'Your session has expired. Sign in again and retry.',
  contention: 'Someone else was changing this at the same moment. Please try again.',
  permission: 'You do not have permission to make this change.',
} as const;

export type RpcFailureKind =
  /** One of our own `raise exception` guards — its token is meaningful. */
  | 'guard'
  /** RLS or `_forbidden()`. */
  | 'permission'
  /** Lock contention. Retrying is the whole remedy. */
  | 'contention'
  /** The request never reached the server. */
  | 'offline'
  /** Signed out, or a JWT past its expiry. */
  | 'session'
  /** A SQLSTATE that means our code or our schema is wrong. Never shown raw. */
  | 'internal'
  /** No code at all — a thrown `Error`, a string, something hand-rolled. */
  | 'unknown';

export type RpcFailure = {
  /** SQLSTATE or PostgREST code, upper-cased. `null` when there is none. */
  code: string | null;
  /** The server's own sentence, or `''`. */
  message: string;
  /** message + details + hint + any nested text, for token matching. */
  haystack: string;
  kind: RpcFailureKind;
};

/**
 * Text that reads as prose rather than as a database talking to itself.
 *
 * Only consulted for failures that carry no code, where there is no SQLSTATE to
 * judge by. A Postgres sentence has spaces like any other, so the give-away has
 * to be its vocabulary.
 */
const SQL_SHAPED =
  /\b(column|relation|constraint|operator|schema|function)\b.*\b(does not exist|is of type|violates)\b|syntax error at|invalid input syntax|duplicate key value|permission denied for/i;

function looksHuman(text: string): boolean {
  return /\s/.test(text) && !SQL_SHAPED.test(text);
}

/** A bare `raise exception` token: `snake_case`, no sentence around it. */
function looksLikeToken(text: string): boolean {
  return /^[a-z][a-z0-9_]*(:.*)?$/.test(text.trim());
}

function asCode(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim().toUpperCase();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/**
 * Everything textual in whatever was thrown, flattened.
 *
 * A walk rather than a property read because the same failure reaches us in
 * four shapes across this codebase: PostgREST's plain object, an `Error` thrown
 * by `useRpc`, GoTrue's `{ error, error_description }`, and an Edge Function
 * response nested one level down in `context`. Depth-limited so a self-
 * referencing object cannot spin.
 */
function walk(value: unknown, depth: number, parts: string[], codes: (string | null)[]): void {
  if (value == null || depth > 3) return;

  if (typeof value === 'string') {
    if (value.trim()) parts.push(value.trim());
    return;
  }

  if (typeof value !== 'object') return;

  const o = value as Record<string, unknown>;
  codes.push(asCode(o.code));

  for (const key of ['message', 'error_description', 'msg', 'details', 'hint', 'description']) {
    walk(o[key], depth + 1, parts, codes);
  }
  // `error` and `cause` can each be a string or another error object.
  walk(o.error, depth + 1, parts, codes);
  walk(o.cause, depth + 1, parts, codes);
  walk(o.context, depth + 1, parts, codes);
}

function isOffline(error: unknown, haystack: string): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const name = (error as { name?: unknown } | null)?.name;
  if (name === 'AbortError' || name === 'TimeoutError') return true;
  // supabase-js wraps a dead network as `TypeError: Failed to fetch`.
  return /failed to fetch|networkerror|network request failed|load failed/i.test(haystack);
}

function classify(code: string | null, error: unknown, haystack: string): RpcFailureKind {
  if (isOffline(error, haystack)) return 'offline';
  if (!code) return 'unknown';
  if (code === RAISE_EXCEPTION) return 'guard';
  if (code === INSUFFICIENT_PRIVILEGE) return 'permission';
  if (CONTENTION.has(code)) return 'contention';
  if (SESSION.has(code)) return 'session';
  return 'internal';
}

/** Normalises anything a failed Supabase call can produce into one shape. */
export function readRpcError(error: unknown): RpcFailure {
  const parts: string[] = [];
  const codes: (string | null)[] = [];

  if (error instanceof Error) {
    if (error.message) parts.push(error.message);
    walk(error as unknown as Record<string, unknown>, 1, parts, codes);
  } else {
    walk(error, 0, parts, codes);
  }

  const unique = [...new Set(parts)];
  const code = codes.find((c): c is string => !!c) ?? null;
  const haystack = unique.join(' | ');

  return {
    code,
    message: unique[0] ?? '',
    haystack,
    kind: classify(code, error, haystack),
  };
}

export type RpcErrorOptions = {
  /** Shown when nothing better can be said. */
  fallback?: string;
  /**
   * Where to log failures the user is not shown. Defaults to `console.error`.
   * A `42804` that reaches a user as "something went wrong" must still reach an
   * engineer as itself, or the next report of this is a screenshot with no code
   * in it.
   */
  report?: (failure: RpcFailure, error: unknown) => void;
};

function defaultReport(failure: RpcFailure, error: unknown): void {
  if (typeof console === 'undefined') return;
  console.error(
    `[sinnapi] unexpected RPC failure${failure.code ? ` (${failure.code})` : ''}`,
    error,
  );
}

/**
 * A failed RPC as a sentence the person can act on.
 *
 * `errors` maps the tokens a domain's RPCs raise to copy written for that
 * domain — `quotation_not_answerable` means something different to a client
 * looking at a quote than a generic phrase ever could. Matching is `includes`
 * against the whole haystack, because a raise with an interpolated value
 * (`unsupported_status: foo`) has to hit the same entry as the bare token.
 */
export function rpcErrorMessage(
  error: unknown,
  errors: Record<string, string> = {},
  options: RpcErrorOptions = {},
): string {
  const { fallback = RPC_ERROR_COPY.fallback, report = defaultReport } = options;
  const failure = readRpcError(error);

  // Never reached the server: nothing about the request itself is wrong.
  if (failure.kind === 'offline') return RPC_ERROR_COPY.offline;

  // The domain's own copy wins wherever it applies. This runs before the
  // permission and guard branches so that `forbidden` — which arrives as 42501,
  // not P0001 — still gets the sentence written for this particular object.
  for (const [token, message] of Object.entries(errors)) {
    if (failure.haystack.includes(token)) return message;
  }

  switch (failure.kind) {
    case 'session':
      return RPC_ERROR_COPY.session;
    case 'permission':
      return RPC_ERROR_COPY.permission;
    case 'contention':
      return RPC_ERROR_COPY.contention;
    case 'guard':
      // Ours, and unmapped. A raise carrying a real sentence is shown as
      // written; a bare token is a string only we were meant to read, so the
      // gap in the table is reported rather than rendered.
      if (failure.message && !looksLikeToken(failure.message)) return failure.message;
      report(failure, error);
      return fallback;
    case 'internal':
      report(failure, error);
      return RPC_ERROR_COPY.internal;
    default:
      // No code: a thrown `Error` with copy in it, or a bare string. Shown if
      // it reads like something written for a person.
      if (failure.message && looksHuman(failure.message)) return failure.message;
      if (failure.message) report(failure, error);
      return fallback;
  }
}
