import type { PaymentTraceRow } from '@/lib/types';
import { ACTOR_KINDS, type ActorKindKey } from '@/lib/audit';

/**
 * How each stream of the trace reads, and what it means.
 *
 * The seven streams come from seven tables, and an investigator does not think
 * in table names — they think "what did we say to the provider" and "when did
 * the money move". These are those questions.
 */
export const TRACE_STREAMS: Record<PaymentTraceRow['stream'], { label: string; hint: string }> = {
  payment: { label: 'Payment', hint: 'The charge itself' },
  audit: { label: 'Change', hint: 'A record changed, and who caused it' },
  psp_traffic: { label: 'Provider', hint: 'A message on the wire, either direction' },
  delivery: { label: 'Delivery', hint: "The provider's notification, and its gate" },
  ledger: { label: 'Ledger', hint: 'A double-entry posting' },
  escrow: { label: 'Escrow', hint: 'The escrow state machine' },
  notification: { label: 'Notified', hint: 'What we told people, and whether it went' },
};

/** How a trace row's actor reads on one line. */
export function traceActor(row: PaymentTraceRow): string {
  if (!row.actor_kind) return '—';
  const kind = ACTOR_KINDS[row.actor_kind as ActorKindKey]?.label ?? row.actor_kind;
  // Three levels of specificity, and each is worth having: WHAT kind of thing
  // (a provider webhook), WHICH one (pesapal_ipn), and WHO if it was a person.
  const which = row.actor_label ? ` (${row.actor_label})` : '';
  const who = row.actor_name ? ` — ${row.actor_name}` : '';
  return `${kind}${which}${who}`;
}

/**
 * The trace as plain text, for pasting into a ticket.
 *
 * This exists because the alternative is what support does today: screenshot
 * the page, or retype the story into a provider's support form and get a
 * timestamp wrong. A provider disputing whether their IPN arrived wants the
 * sequence, and the sequence has to survive being pasted into a plain-text
 * field.
 *
 * Fixed-width columns rather than a table or JSON: a monospace paste into
 * Jira, Slack or an email stays aligned, and a human can read it without a
 * renderer. The detail is deliberately NOT expanded — a trace with every
 * payload inlined is thousands of lines and nobody reads it; the ticket needs
 * the shape of what happened, and the console is where you go for the bodies.
 */
export function traceAsText(
  rows: PaymentTraceRow[],
  meta: { correlationId: string; paymentId: string },
): string {
  const header = [
    `Sinnapi payment trace`,
    `payment      ${meta.paymentId}`,
    `trace id     ${meta.correlationId}`,
    `exported     ${new Date().toISOString()}`,
    `rows         ${rows.length}`,
    '',
    'when                      stream      what                            who',
    '─'.repeat(110),
  ];

  const body = rows.map((r) => {
    const when = r.occurred_at ? new Date(r.occurred_at).toISOString() : '—';
    const stream = TRACE_STREAMS[r.stream]?.label ?? r.stream;
    return [
      when.padEnd(25),
      stream.padEnd(11),
      truncate(r.label, 31).padEnd(32),
      traceActor(r),
    ].join(' ');
  });

  // The one-line summary a reader wants before the detail: which automated
  // things touched this transaction at all. "A provider webhook and a
  // reconciliation sweep both applied to this payment" is the finding, and it
  // is easy to miss in forty rows.
  const kinds = [...new Set(rows.map((r) => r.actor_kind).filter(Boolean))];
  const footer = ['', '─'.repeat(110), `actors involved: ${kinds.join(', ') || 'none recorded'}`];

  return [...header, ...body, ...footer].join('\n');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
