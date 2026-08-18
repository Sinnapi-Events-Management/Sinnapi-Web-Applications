// Campaign -> outbound message. Content only; transport selection lives in
// `_shared/campaignTransport.ts` and the shell in `_shared/newsletterTemplate.ts`.
//
// Nothing here is transport-aware, and that is the point: the message a
// recipient receives must be identical whether Resend or SMTP carried it, so a
// preview stays a preview of the real thing across a transport swap.
import { PUBLIC_SITE_URL } from '../_shared/emailTemplate.ts';
import { newsletterLayout, newsletterText } from '../_shared/newsletterTemplate.ts';
import type { CampaignMessage } from '../_shared/campaignMessage.ts';

/**
 * Read an env var without assuming a Deno global.
 *
 * Same guard as `_shared/emailTemplate.ts`: this module is I/O-free content
 * only, and `scripts/preview-emails.mjs` loads it under Node to render every
 * template to disk. A bare `Deno.env` reference here would break that harness,
 * which is the only place these emails get looked at before they are sent.
 */
function env(key: string): string | undefined {
  return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(
    key,
  );
}

/** Base for links back into the public site. */
const SITE = PUBLIC_SITE_URL.replace(/\/$/, '');

/**
 * Base for the one-click endpoint.
 *
 * Derived from `SUPABASE_URL` (always present in the Edge runtime) so a
 * deployment cannot end up shipping an unsubscribe header pointing at nothing.
 * `FUNCTIONS_BASE_URL` overrides it for custom-domain setups.
 */
const FUNCTIONS =
  env('FUNCTIONS_BASE_URL')?.replace(/\/$/, '') ??
  `${(env('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1`;

/**
 * Where the footer's visible links point: a real page, with the brand on it,
 * where somebody can turn one topic off without losing the other. The
 * preference centre is the reason a "this isn't for me" reaction becomes a
 * narrowed subscription rather than a spam report.
 */
export function preferencesUrl(token: string): string {
  return `${SITE}/unsubscribe?t=${encodeURIComponent(token)}`;
}

/**
 * Where the RFC 8058 header points: an endpoint, not a page.
 *
 * The mail client POSTs this with no session and never shows the response, so
 * it has to succeed without any page having loaded. Clients that instead follow
 * it as a link get redirected to the preference centre by the handler, which is
 * why one URL can serve both behaviours.
 */
export function oneClickUrl(token: string): string {
  return `${FUNCTIONS}/marketing-consent?action=one-click&t=${encodeURIComponent(token)}`;
}

/**
 * The "why am I getting this" sentence.
 *
 * Written per audience because a vendor and a client opted in at genuinely
 * different moments, and a generic line ("you subscribed to our newsletter")
 * is exactly the sentence that makes somebody who does not remember doing so
 * reach for the spam button.
 */
export function audienceReason(audience: 'clients' | 'vendors'): string {
  return audience === 'vendors'
    ? 'You are receiving this because you opted in to Sinnapi vendor updates when you applied to list your business.'
    : 'You are receiving this because you opted in to Sinnapi updates for people planning events.';
}

// ───────────────────────────────────────────────────────────────────────────
// Greeting
// ───────────────────────────────────────────────────────────────────────────

/** What everybody gets when there is no name worth using. */
const FALLBACK_GREETING = 'Hi there,';

/** The part of an address before the `@`, lowercased. */
function localPart(email: string): string {
  return email.split('@')[0]?.trim().toLowerCase() ?? '';
}

/**
 * The name to greet this recipient by, or `null` for the generic opening.
 *
 * Personalisation is worth doing only if it is right. A greeting that gets the
 * name wrong is worse than no greeting at all: "Hi there," reads as a normal
 * marketing email, whereas "Hi hadijah315," announces that the sender is a
 * script working from a database it does not understand. So this function is
 * biased toward the fallback, and every rule below exists because of a
 * SPECIFIC way the stored data goes wrong:
 *
 *   * `profiles.full_name` is NOT NULL and its trigger falls back to the email
 *     local-part (see migration 20260718000001), so a perfectly ordinary
 *     account can be stored as "hadijah315". That is a placeholder wearing a
 *     name's clothes, and comparing the WHOLE stored name against the local
 *     part is what unmasks it. Comparing only the first token would be wrong in
 *     the other direction: "Sarah" <sarah@example.com> is a real first name
 *     that happens to match, and she should still be greeted by it.
 *   * Uploaded spreadsheets carry junk in the name column — order references,
 *     numbered placeholders. Any digit disqualifies: given names do not contain
 *     them, and the cost of a false negative is one generic greeting.
 *   * A value with an `@` in it is an address somebody pasted into the wrong
 *     column, and greeting somebody by their own email address is the single
 *     most obviously-broken thing this could do.
 *
 * Casing is left exactly as stored. Title-casing would "fix" a lowercase entry
 * and simultaneously mangle every name where the capitalisation is the point —
 * "de Souza", "van der Berg", "McArthur".
 */
export function greetingName(opts: {
  firstName?: string | null;
  fullName?: string | null;
  email: string;
}): string | null {
  const full = (opts.fullName ?? '').trim();
  const local = localPart(opts.email);

  // The whole stored name IS the local part — a placeholder, not a name. The
  // given name was derived from it, so it is tainted too.
  if (full && local && full.toLowerCase() === local) return null;

  const candidate = (opts.firstName ?? '').trim() || full.split(/\s+/)[0] || '';
  if (!candidate) return null;
  if (candidate.includes('@')) return null;
  if (/\d/.test(candidate)) return null;
  // Must contain a letter: "-", "?" and "." all appear in placeholder columns.
  if (!/\p{L}/u.test(candidate)) return null;
  // A "name" this long is a sentence somebody put in the wrong field.
  if (candidate.length > 40) return null;

  return candidate;
}

/**
 * The rendered opening line, for both the HTML and text parts.
 *
 * Returns a complete line rather than a name so there is exactly one place that
 * decides the wording and the punctuation, and no caller can assemble
 * "Hi" + null.
 */
export function greetingLine(opts: {
  firstName?: string | null;
  fullName?: string | null;
  email: string;
}): string {
  const name = greetingName(opts);
  return name ? `Hi ${name},` : FALLBACK_GREETING;
}

/**
 * Assemble one recipient's message.
 *
 * `bodyHtml`/`bodyText` are rendered once per campaign and passed in: the
 * blocks are identical for everybody, and re-walking the document tree per
 * recipient would be the most expensive thing in the send loop for no benefit.
 * Only the shell differs — the unsubscribe token and, now, the greeting.
 */
export function campaignMessage(opts: {
  campaignId: string;
  subject: string;
  preheader?: string | null;
  audience: 'clients' | 'vendors';
  bodyHtml: string;
  bodyText: string;
  to: string;
  unsubscribeToken: string;
  /** Copied onto the recipient row at queue time. */
  firstName?: string | null;
  fullName?: string | null;
}): CampaignMessage {
  const prefs = preferencesUrl(opts.unsubscribeToken);
  const oneClick = oneClickUrl(opts.unsubscribeToken);
  const reason = audienceReason(opts.audience);
  const greeting = greetingLine({
    firstName: opts.firstName,
    fullName: opts.fullName,
    email: opts.to,
  });

  return {
    to: opts.to,
    subject: opts.subject,
    html: newsletterLayout({
      subject: opts.subject,
      preheader: opts.preheader ?? undefined,
      greeting,
      body: opts.bodyHtml,
      // The visible "Unsubscribe" link goes to the preference centre rather
      // than firing the one-click endpoint: a human clicking a link in a page
      // they are reading deserves a confirmation screen, whereas the header
      // endpoint is a machine-to-machine call that must not need one.
      unsubscribeUrl: prefs,
      preferencesUrl: prefs,
      reason,
    }),
    text: newsletterText({
      greeting,
      lines: [opts.bodyText],
      unsubscribeUrl: prefs,
      preferencesUrl: prefs,
      reason,
    }),
    unsubscribeUrl: oneClick,
    tags: { campaign_id: opts.campaignId, audience: opts.audience },
  };
}
