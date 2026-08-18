// Bulk-email transport selection for marketing campaigns.
//
// ── Why this layer exists ──────────────────────────────────────────────────
// Campaigns have gone out over the Resend HTTP API since the subsystem was
// built, for the reasons documented in `./resend.ts`: per-recipient
// `List-Unsubscribe` headers, batching, and — the part SMTP genuinely cannot
// replace — a delivery feedback loop that writes bounces and complaints into
// `email_suppressions` without anybody being asked to intervene.
//
// That feedback loop is why this file is a SWITCH and not a replacement. When
// the Resend account is unavailable, campaigns still have to go out, and the
// only other transport this platform has is the authenticated SMTP connection
// transactional mail already uses. Rather than rewrite the send loop against
// SMTP and rewrite it back afterwards — two changes to the riskiest code in the
// product, in opposite directions, to end up where we started — both transports
// implement one interface and the worker asks this module which one is live.
//
// ── What choosing SMTP costs ───────────────────────────────────────────────
// An SMTP send produces a `250 accepted` and nothing else, ever. No
// delivered / opened / clicked events will arrive, so `newsletter_events` gains
// no rows and the engagement columns on `newsletter_recipients` stay null for
// every campaign sent that way. The schema, the webhook endpoint and the stats
// RPC are all deliberately left intact so that rolling back is an environment
// variable rather than a revert: the moment `resend` is selected again,
// telemetry resumes on new campaigns. Campaigns sent over SMTP keep their
// permanent, honest zeroes rather than borrowing numbers they never earned.
//
// The one signal SMTP does give is a 5xx refusal at send time, which is the
// same fact a bounce webhook carries. The dispatcher suppresses on it, so the
// suppression list keeps growing while the webhook has nothing feeding it.
//
// ── Selection ──────────────────────────────────────────────────────────────
//   NEWSLETTER_TRANSPORT = 'smtp' | 'resend'
//     An explicit value always wins. That matters more than it looks: during a
//     transport swap the other provider's credentials are usually still sitting
//     in the project, and auto-detection alone would silently route a send back
//     to the account we are trying to avoid.
//
//   Unset — auto-detect. Resend when it is fully configured, SMTP otherwise.
//     Nothing configured at all resolves to `null`, and the worker reports a
//     skip rather than failing every recipient row.
import { resendDriver } from './resend.ts';
import { smtpCampaignDriver } from './campaignSmtp.ts';
import type {
  CampaignDriver,
  CampaignMessage,
  SendOutcome,
  TransportName,
} from './campaignMessage.ts';

export type { CampaignDriver, CampaignMessage, SendOutcome, TransportName };
export { campaignReplyTo, unsubscribeHeaders } from './campaignMessage.ts';

const DRIVERS: Record<TransportName, CampaignDriver> = {
  resend: resendDriver,
  smtp: smtpCampaignDriver,
};

/**
 * The live transport, or `null` when nothing is configured.
 *
 * An explicitly named transport is returned even when it is misconfigured. That
 * is deliberate: `NEWSLETTER_TRANSPORT=smtp` with no SMTP host is an operator
 * mistake that should surface as a loud, specific `smtp_not_configured` on the
 * next tick, not as a silent fallback to the provider they were moving away
 * from. `campaignTransportConfigured()` is what the worker gates on.
 */
export function campaignTransport(): CampaignDriver | null {
  const explicit = Deno.env.get('NEWSLETTER_TRANSPORT')?.trim().toLowerCase();
  if (explicit === 'smtp' || explicit === 'resend') return DRIVERS[explicit];
  if (explicit) {
    console.warn(
      JSON.stringify({ level: 'warn', message: 'unknown_newsletter_transport', value: explicit }),
    );
  }

  if (DRIVERS.resend.configured()) return DRIVERS.resend;
  if (DRIVERS.smtp.configured()) return DRIVERS.smtp;
  return null;
}

/** Name of the live transport, for logs and skip reasons. */
export function campaignTransportName(): TransportName | 'none' {
  return campaignTransport()?.name ?? 'none';
}

export function campaignTransportConfigured(): boolean {
  const driver = campaignTransport();
  return Boolean(driver && driver.configured());
}

/** Messages the live transport accepts per `sendCampaignBatch` call. */
export function maxBatchSize(): number {
  return campaignTransport()?.maxBatch ?? 1;
}

/**
 * Send up to `maxBatchSize()` messages over the live transport.
 *
 * Returns one outcome per input, positionally — the caller writes a status onto
 * a specific recipient row, so a shifted result would mark the wrong person
 * sent. Both drivers uphold that ordering.
 *
 * Never throws. A campaign worker that dies on a network blip leaves rows
 * leased with nobody to recover them until the lease lapses; returning a
 * per-message error lets the caller retry or dead-letter each row on its own
 * terms.
 */
export async function sendCampaignBatch(messages: CampaignMessage[]): Promise<SendOutcome[]> {
  if (messages.length === 0) return [];

  const driver = campaignTransport();

  // Every failure below is `transportFault`: none of them looked at a recipient.
  // The dispatcher reads that flag to return the rows to the queue with their
  // attempt count intact, so an unconfigured or unreachable transport parks a
  // campaign instead of consuming its retry budget against a problem only an
  // operator can fix.
  if (!driver) {
    return messages.map(() => ({ error: 'transport_not_configured', transportFault: true }));
  }
  if (!driver.configured()) {
    return messages.map(() => ({
      error: `${driver.name}_not_configured`,
      transportFault: true,
    }));
  }
  if (messages.length > driver.maxBatch) {
    // A caller-side bug, but one that would otherwise surface as a truncated
    // send that looks successful. Retrying the same oversized batch cannot
    // succeed either, so it parks rather than burning attempts.
    return messages.map(() => ({ error: 'batch_too_large', transportFault: true }));
  }

  try {
    return await driver.send(messages);
  } catch (e) {
    // A driver is contracted not to throw, so reaching here means it broke in a
    // way it did not anticipate — which says nothing about any one recipient.
    const detail = e instanceof Error ? e.message : 'transport_error';
    return messages.map(() => ({ error: detail, transportFault: true }));
  }
}

/** Single send — used by the composer's "send a test to myself". */
export async function sendCampaignEmail(message: CampaignMessage): Promise<SendOutcome> {
  const [outcome] = await sendCampaignBatch([message]);
  return outcome ?? { error: 'no_result' };
}
