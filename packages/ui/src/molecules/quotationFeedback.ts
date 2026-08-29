/**
 * What the other side said about a quotation, as data. Pure (no React/MUI),
 * shared by the client and vendor portals for the same reason
 * `quotationTransitions` beside it is: both portals read one record and must
 * not arrive at two readings of it.
 *
 * THE PROBLEM THIS SOLVES
 * A client answering a quote with "Request changes" writes a sentence — the one
 * sentence that says what is wrong with the price. `respond_quotation` puts it
 * in `quotation_status_history.reason` and nowhere else: `quotations` has no
 * column for it. So the only surface that ever showed it was the status trail,
 * which lives behind the Progress tab, which is the last tab, which nobody
 * opens when the quote they are looking at simply says `revised`.
 *
 * The vendor's actual question on opening that quote is "what do they want
 * changed", and the answer was three taps away with no sign it existed. This
 * module is how it gets to the top of the page instead.
 */

/**
 * A `quotation_status_history` row, as much of it as this needs.
 *
 * `actor_id` is the column that makes authorship knowable. It is trigger-set to
 * `auth.uid()` on every transition, so it is authoritative — where the status
 * alone is not: `voided` is written by `void_quotation`, which either party may
 * call, and a page that guessed "voided means the client" would tell a client
 * they had cancelled a quote their vendor withdrew.
 */
export type QuotationHistoryRow = {
  id: string;
  to_status: string;
  reason: string | null;
  occurred_at: string;
  actor_id?: string | null;
};

/**
 * What the other side did, in the terms the reader cares about.
 *
 * Narrower than the status list on purpose: only transitions that a person
 * chose and attached a sentence to are feedback. `sent`, `draft` and `accepted`
 * are events, not messages — nobody writes a note to explain that they agreed.
 */
export type QuotationFeedbackKind = 'changes-requested' | 'declined' | 'ended';

/** The statuses that carry a response, mapped to what that response is. */
const KINDS: Record<string, QuotationFeedbackKind> = {
  revised: 'changes-requested',
  declined: 'declined',
  voided: 'ended',
};

/**
 * Who a transition must have come from when `actor_id` cannot say.
 *
 * `revised` and `declined` are `respond_quotation` outcomes, and that function
 * is `actors: ['client']` — only the client can produce them, so for those two
 * the status *is* the attribution. `voided` is the one that genuinely cannot be
 * inferred: `void_quotation` serves the client's void and the vendor's
 * withdrawal from one code path. It is absent here rather than given a guess.
 */
const IMPLIED_AUTHOR: Record<string, 'client' | 'vendor'> = {
  revised: 'client',
  declined: 'client',
};

export type QuotationFeedback = {
  /** The history row's id — stable across refetches, so it keys a dismissal. */
  id: string;
  kind: QuotationFeedbackKind;
  /** Who wrote it — see `resolveAuthor`. */
  author: 'client' | 'vendor';
  /**
   * What they said. Never empty: a transition with no note is not feedback,
   * and a callout reading "the client asked for changes" over blank space is a
   * heading with nothing under it.
   */
  reason: string;
  occurredAt: string;
  status: string;
  /**
   * Whether this is still the quotation's own state — i.e. the ball is in the
   * reader's court and this note is the brief for what to do next.
   *
   * A `revised` quote sitting at `revised` is an open request. The same note on
   * a quote since re-sent is history, and belongs in the trail rather than at
   * the top of the page shouting about work that is already done.
   */
  isOutstanding: boolean;
};

/**
 * The newest thing the counterparty said about this quotation, or `null`.
 *
 * Newest rather than first-outstanding, and deliberately: a client who asks for
 * changes twice has superseded their own first note, and showing the older one
 * because it is the one still "open" would send the vendor to rework a line the
 * client stopped caring about.
 *
 * `viewer` decides whose notes are worth surfacing — the reader's own words are
 * not news to them, with one exception the callers handle rather than this
 * does: a client waiting on a rework wants their own request echoed back, which
 * is `latestQuotationFeedbackFromEither`.
 */
export function latestQuotationFeedback(
  rows: readonly QuotationHistoryRow[] | null | undefined,
  options: {
    /** The quotation's `client_id` — the one id both portals already hold. */
    clientId: string | null | undefined;
    /** The quotation's current status, for `isOutstanding`. */
    currentStatus: string | null | undefined;
    /** Which side is reading. Notes they wrote themselves are skipped. */
    viewer: 'client' | 'vendor';
  },
): QuotationFeedback | null {
  return pick(rows, options, (f) => f.author !== options.viewer);
}

/**
 * The newest note on the quotation whoever wrote it.
 *
 * The client's side of the mirror. A client whose quote reads `revised` is
 * waiting on a rework they themselves asked for, and "you asked for these
 * changes two days ago" is the sentence that stops them wondering what the
 * hold-up is. Authorship still comes back on the result, so the caller words it
 * as "you said" or "the vendor said" rather than flattening the two.
 */
export function latestQuotationFeedbackFromEither(
  rows: readonly QuotationHistoryRow[] | null | undefined,
  options: {
    clientId: string | null | undefined;
    currentStatus: string | null | undefined;
  },
): QuotationFeedback | null {
  return pick(rows, options, () => true);
}

function pick(
  rows: readonly QuotationHistoryRow[] | null | undefined,
  options: { clientId: string | null | undefined; currentStatus: string | null | undefined },
  accept: (feedback: QuotationFeedback) => boolean,
): QuotationFeedback | null {
  if (!rows?.length) return null;

  // Reverse chronological by timestamp rather than by array position: the
  // portals read this table ascending for the trail, but a caller that sorted
  // it differently must not silently get the oldest note.
  const newestFirst = [...rows].sort((a, b) => stamp(b.occurred_at) - stamp(a.occurred_at));

  for (const row of newestFirst) {
    const kind = KINDS[row.to_status];
    if (!kind) continue;

    const reason = row.reason?.trim();
    if (!reason) continue;

    const feedback: QuotationFeedback = {
      id: row.id,
      kind,
      author: resolveAuthor(row, options.clientId),
      reason,
      occurredAt: row.occurred_at,
      status: row.to_status,
      isOutstanding: row.to_status === options.currentStatus,
    };

    if (accept(feedback)) return feedback;
  }

  return null;
}

/**
 * Whose words `reason` is.
 *
 * `actor_id` first, because it is the only record of who actually pressed the
 * button — trigger-set to `auth.uid()` on every transition, so it is present on
 * every row this schema has ever written. The fallback is for a caller whose
 * select list omits the column, and it has to be better than a coin toss:
 * `IMPLIED_AUTHOR` covers the two statuses the lifecycle spec makes certain. A
 * `voided` row with no actor lands on `vendor`, which is the reading that errs
 * toward showing the note rather than suppressing it as the reader's own words.
 */
function resolveAuthor(
  row: QuotationHistoryRow,
  clientId: string | null | undefined,
): 'client' | 'vendor' {
  if (row.actor_id && clientId) return row.actor_id === clientId ? 'client' : 'vendor';
  return IMPLIED_AUTHOR[row.to_status] ?? 'vendor';
}

function stamp(value: string): number {
  const at = new Date(value).getTime();
  return Number.isFinite(at) ? at : 0;
}

export type QuotationFeedbackCopy = {
  /** The heading — who did what, in one line. */
  title: string;
  /** What it means for the reader now, or `null` when the title says it all. */
  hint: string | null;
  severity: 'info' | 'warning' | 'error' | 'success';
};

/**
 * How to word a piece of feedback for the person reading it.
 *
 * Kept beside the extraction rather than in either portal's components, because
 * the two sides read the same three events and the copy has to stay a mirror:
 * "the client asked for changes" and "you asked for changes" describe one row,
 * and a portal that drifted to "revision pending" on one side would have the
 * two of them naming the same thing differently in a thread about it.
 *
 * Severity is the reader's stake, not the event's drama. An outstanding
 * revision request is `warning` because it is work the reader owes; the same
 * request once answered is `info`, because it is only a record.
 */
export function quotationFeedbackCopy(
  feedback: QuotationFeedback,
  viewer: 'client' | 'vendor',
): QuotationFeedbackCopy {
  const mine = feedback.author === viewer;
  const them = feedback.author === 'client' ? 'The client' : 'The vendor';

  if (feedback.kind === 'changes-requested') {
    if (mine) {
      return {
        title: 'You asked for changes',
        hint: feedback.isOutstanding
          ? 'The vendor is reworking the quote. You will be notified when the new price arrives.'
          : null,
        severity: feedback.isOutstanding ? 'info' : 'info',
      };
    }
    return {
      title: `${them} asked for changes`,
      hint: feedback.isOutstanding
        ? 'Update the quote and send it again, or reply below if you need more detail first.'
        : null,
      severity: feedback.isOutstanding ? 'warning' : 'info',
    };
  }

  if (feedback.kind === 'declined') {
    return {
      title: mine ? 'You declined this quote' : `${them} declined this quote`,
      hint: null,
      severity: 'error',
    };
  }

  return {
    title: mine
      ? 'You ended this quotation'
      : feedback.author === 'client'
        ? 'The client voided this quotation'
        : 'The vendor withdrew this quote',
    hint: null,
    severity: 'error',
  };
}
