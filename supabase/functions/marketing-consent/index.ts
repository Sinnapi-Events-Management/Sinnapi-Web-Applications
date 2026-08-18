// marketing-consent — the public consent surface: double opt-in confirmation,
// the preference centre, and RFC 8058 one-click unsubscribe.
//
// ── Why this is public, and why that is safe ───────────────────────────────
// `verify_jwt = false`, because every caller here is by definition holding an
// email link and not a session: a mail client POSTing a one-click unsubscribe
// has no JWT and never will, and requiring a login to unsubscribe is exactly
// the friction GDPR Art.7(3) forbids ("as easy to withdraw as to give").
//
// The capability is the token, not the session. Each is 192 bits of CSPRNG
// output, is never rendered in any admin screen, and is unreachable through
// PostgREST — the RLS policies on `marketing_subscriptions` expose no anon
// path at all, so the only way to act on one is through the SECURITY DEFINER
// functions this handler calls. Guessing one is not a threat model.
//
// ── The one-click contract ─────────────────────────────────────────────────
// RFC 8058 says the mail client POSTs `List-Unsubscribe=One-Click` to the URL
// and shows the user nothing. Two consequences shape this handler:
//
//   * The POST must succeed without a page, a session or a confirmation step,
//     and must answer 200 even for a token we do not recognise — a one-click
//     endpoint that distinguishes valid from invalid tokens is an oracle for
//     which addresses are on the list.
//   * Some clients render the same URL as an ordinary link instead. A GET
//     therefore REDIRECTS to the preference centre rather than unsubscribing:
//     link scanners and prefetchers issue GETs, and an endpoint that opts
//     people out on GET will opt them out without them ever clicking.
import { handler, json } from '../_shared/http.ts';
import { adminClient, HttpError } from '../_shared/supabase.ts';
import { PUBLIC_SITE_URL } from '../_shared/emailTemplate.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  confirmSubscriptionEmail,
  confirmSubscriptionUrl,
  type MarketingTopic,
} from '../_shared/marketingEmails.ts';
import { sendEmail } from '../_shared/email.ts';

const SITE = PUBLIC_SITE_URL.replace(/\/$/, '');
const TOPICS: MarketingTopic[] = ['client_updates', 'vendor_updates'];

/** Days a double opt-in link stays live — mirrors the DB's 7-day expiry. */
const CONFIRM_EXPIRY_DAYS = 7;

Deno.serve(
  handler(async (req) => {
    const url = new URL(req.url);

    // ── RFC 8058 one-click ────────────────────────────────────────────────
    if (url.searchParams.get('action') === 'one-click') {
      return oneClick(req, url);
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      token?: string;
      topic?: string;
      subscribed?: boolean;
    };

    const token = (body.token ?? '').trim();
    if (!token) throw new HttpError(400, 'invalid:token');

    const supa = adminClient();

    switch (body.action) {
      case 'confirm':
        return json(req, await confirm(supa, token));
      case 'preferences':
        return json(req, await preferences(supa, token));
      case 'set': {
        if (!TOPICS.includes(body.topic as MarketingTopic)) {
          throw new HttpError(400, 'invalid:topic');
        }
        const { error } = await supa.rpc('marketing_set_preference', {
          p_token: token,
          p_topic: body.topic,
          p_subscribed: Boolean(body.subscribed),
          p_ip: clientIp(req),
          p_user_agent: req.headers.get('user-agent'),
        });
        if (error) throw new HttpError(500, 'update_failed');
        return json(req, await preferences(supa, token));
      }
      case 'unsubscribe': {
        const { error } = await supa.rpc('marketing_unsubscribe_all', {
          p_token: token,
          p_ip: clientIp(req),
          p_user_agent: req.headers.get('user-agent'),
        });
        if (error) throw new HttpError(500, 'update_failed');
        return json(req, await preferences(supa, token));
      }
      default:
        throw new HttpError(422, 'invalid:action');
    }
  }),
);

// ───────────────────────────────────────────────────────────────────────────
// Handlers
// ───────────────────────────────────────────────────────────────────────────

async function oneClick(req: Request, url: URL): Promise<Response> {
  const token = url.searchParams.get('t') ?? '';

  if (req.method === 'GET') {
    // A human, or a scanner. Neither should be unsubscribed by a page load.
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders(req.headers.get('origin')),
        Location: `${SITE}/unsubscribe?t=${encodeURIComponent(token)}`,
      },
    });
  }

  // The RPC answers true for an unknown token as well as a known one, so this
  // reply is identical either way.
  await adminClient().rpc('marketing_unsubscribe_all', {
    p_token: token,
    p_ip: clientIp(req),
    p_user_agent: req.headers.get('user-agent'),
  });

  // Plain text, not JSON: nothing renders this, and the spec only asks for 2xx.
  return new Response('Unsubscribed', {
    status: 200,
    headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': 'text/plain' },
  });
}

type PreferenceRow = {
  email: string;
  suppressed: boolean;
  topics: Array<{ topic: string; status: string }>;
};

/**
 * Resolve a token to the preference-centre state.
 *
 * An unknown token returns `found: false` rather than a 404, so the page can
 * say "this link has expired, here is how to reach us" instead of showing an
 * error screen for what is usually just a very old email.
 */
async function preferences(supa: ReturnType<typeof adminClient>, token: string) {
  const { data, error } = await supa.rpc('marketing_preferences', { p_token: token });
  if (error) throw new HttpError(500, 'lookup_failed');

  const row = (data as PreferenceRow[] | null)?.[0];
  if (!row) return { found: false as const };

  return {
    found: true as const,
    email: maskEmail(row.email),
    suppressed: row.suppressed,
    topics: TOPICS.map((topic) => ({
      topic,
      subscribed: (row.topics ?? []).some((t) => t.topic === topic && t.status === 'subscribed'),
      known: (row.topics ?? []).some((t) => t.topic === topic),
    })),
  };
}

/**
 * Complete a double opt-in.
 *
 * `expired` gets its own outcome so the page can offer a fresh link instead of
 * a dead end — an expired confirmation is somebody who DID want the mail and
 * came back a week late, which is the worst possible moment to show them a
 * generic failure.
 */
async function confirm(supa: ReturnType<typeof adminClient>, token: string) {
  const { data, error } = await supa.rpc('marketing_confirm_consent', { p_token: token });
  if (error) throw new HttpError(500, 'confirm_failed');

  const row = (
    data as Array<{ outcome: string; email: string | null; topic: string | null }> | null
  )?.[0];
  if (!row) return { outcome: 'unknown' as const };

  // Re-arm and re-send when the link lapsed, so the person is one click from
  // where they meant to be rather than back at the sign-up form.
  if (row.outcome === 'expired' && row.email && row.topic) {
    const { data: captured } = await supa.rpc('marketing_capture_consent', {
      p_email: row.email,
      p_topic: row.topic,
      p_source: 'preference_centre',
      p_consent_text: 'Re-requested confirmation after the original link expired.',
      p_double_opt_in: true,
    });
    const fresh = (captured as Array<{ consent_token: string | null }> | null)?.[0]?.consent_token;
    if (fresh) {
      await sendEmail(
        confirmSubscriptionEmail({
          email: row.email,
          topic: row.topic as MarketingTopic,
          confirmUrl: confirmSubscriptionUrl(fresh),
          expiryDays: CONFIRM_EXPIRY_DAYS,
        }),
      );
    }
    return { outcome: 'expired' as const, resent: Boolean(fresh) };
  }

  return { outcome: row.outcome as 'confirmed' | 'already' | 'unknown', topic: row.topic };
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  // Left-most entry is the originating client; the rest are proxies.
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
}

/**
 * Show `j••••@example.com` rather than the address itself.
 *
 * The page is reachable by anyone holding the link — including whoever finds a
 * forwarded email — and it exists to manage a subscription, not to confirm what
 * somebody's address is. Enough is shown for the owner to recognise it.
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '•••';
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
}
