// Campaign -> outbound message. Content only; transport lives in
// `_shared/resend.ts` and the shell in `_shared/newsletterTemplate.ts`.
import { PUBLIC_SITE_URL } from '../_shared/emailTemplate.ts';
import { newsletterLayout, newsletterText } from '../_shared/newsletterTemplate.ts';
import type { CampaignMessage } from '../_shared/resend.ts';

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

/**
 * Assemble one recipient's message.
 *
 * `bodyHtml`/`bodyText` are rendered once per campaign and passed in: the
 * blocks are identical for everybody, and re-walking the document tree per
 * recipient would be the most expensive thing in the send loop for no benefit.
 * Only the shell differs, because only the unsubscribe token differs.
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
}): CampaignMessage {
  const prefs = preferencesUrl(opts.unsubscribeToken);
  const oneClick = oneClickUrl(opts.unsubscribeToken);
  const reason = audienceReason(opts.audience);

  return {
    to: opts.to,
    subject: opts.subject,
    html: newsletterLayout({
      subject: opts.subject,
      preheader: opts.preheader ?? undefined,
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
      lines: [opts.bodyText],
      unsubscribeUrl: prefs,
      preferencesUrl: prefs,
      reason,
    }),
    unsubscribeUrl: oneClick,
    tags: { campaign_id: opts.campaignId, audience: opts.audience },
  };
}
