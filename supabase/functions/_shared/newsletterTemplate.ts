// Sinnapi marketing-email design system: the newsletter shell and the content
// blocks a campaign is composed from.
//
// ── Why this is a second shell rather than a flag on `emailLayout` ──────────
// A transactional email and a newsletter are different documents with different
// obligations, and the differences are not cosmetic:
//
//   * The transactional footer states, correctly, that the message is a service
//     message with nothing to unsubscribe from. A newsletter footer must carry
//     the opposite: who is sending, why this address is receiving it, and two
//     working opt-out paths. Putting both behind one boolean would mean one
//     mistaken argument produces a marketing email with no unsubscribe link,
//     which is the single failure this whole subsystem exists to prevent.
//   * Transactional mail is one heading and a body; a newsletter is a hero, a
//     digest of cards, and CTAs, at full bleed rather than inside a padded card.
//   * Transactional mail attaches the logo by Content-ID over SMTP. Campaigns go
//     out through Resend's HTTP API, which has no inline-attachment path worth
//     relying on, so the masthead here hot-links an absolute HTTPS asset.
//
// Everything else — palette, fonts, escaping, resets, the Outlook table
// discipline — is imported from `./emailTemplate.ts` so the two shells cannot
// drift apart on brand.
//
// ── Email-client constraints ───────────────────────────────────────────────
// Same as the transactional shell: Word-engine Outlook means tables with
// bgcolor/width attributes, inline styles everywhere, VML for rounded buttons,
// and no float/flex/grid/border-radius/max-width dependence. See the header of
// `./emailTemplate.ts` for the full reasoning.
//
// Optional branding env:
//   EMAIL_LOGO_URL — absolute https URL to the masthead logo.
//                    Defaults to `${PUBLIC_SITE_URL}/logo.png`.
import {
  APP_NAME,
  PUBLIC_SITE_URL,
  brandColors,
  contact,
  emailFonts,
  emailHeadStyles,
  escapeHtml,
  escapeUrl,
} from './emailTemplate.ts';

function env(key: string): string | undefined {
  return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(
    key,
  );
}

const c = brandColors;

/** Content width of the email, in px. 600 is the safe universal max. */
const WIDTH = 600;

/** Absolute URL for the masthead logo — campaigns cannot use `cid:`. */
export const LOGO_URL = env('EMAIL_LOGO_URL') ?? `${PUBLIC_SITE_URL.replace(/\/$/, '')}/logo.png`;

/**
 * Registered sender identity, printed in every campaign footer.
 *
 * A postal address is a hard requirement of CAN-SPAM and is what the GDPR
 * transparency duty and the Google/Yahoo bulk-sender rules each expect in
 * practice. It is env-overridable rather than hardcoded because it changes when
 * the company moves and nobody will remember this file when that happens.
 */
export const SENDER_IDENTITY = {
  legalName: env('COMPANY_LEGAL_NAME') ?? 'Sinnapi Events Management Ltd',
  address: env('COMPANY_POSTAL_ADDRESS') ?? 'Kampala, Uganda',
} as const;

// ───────────────────────────────────────────────────────────────────────────
// Content blocks
// ───────────────────────────────────────────────────────────────────────────

/**
 * Opening hero: eyebrow, headline, standfirst, optional image and CTA.
 *
 * The image sits BELOW the text rather than behind it. A background image with
 * text over it is the most requested newsletter hero and the least survivable
 * one — the Word engine drops `background-image` on block elements entirely, so
 * Outlook renders white text on white. Stacking is the version that works
 * everywhere without a VML fill hack per campaign.
 */
export function newsletterHero(opts: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  ctaLabel?: string;
  ctaHref?: string;
}): string {
  const eyebrow = opts.eyebrow
    ? `<p style="margin:0 0 10px;font-family:${emailFonts.body};font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${c.secondaryDark};mso-line-height-rule:exactly">${escapeHtml(opts.eyebrow)}</p>`
    : '';
  const subtitle = opts.subtitle
    ? `<p style="margin:0;font-family:${emailFonts.body};font-size:17px;line-height:27px;color:${c.textSecondary};mso-line-height-rule:exactly">${escapeHtml(opts.subtitle)}</p>`
    : '';
  const image = opts.imageUrl
    ? `<tr><td style="padding:24px 0 0">
         <img src="${escapeUrl(opts.imageUrl)}" width="${WIDTH}" alt="${escapeHtml(opts.imageAlt ?? '')}" style="display:block;width:100%;max-width:${WIDTH}px;height:auto;border:0;outline:none;border-radius:10px" />
       </td></tr>`
    : '';
  const cta =
    opts.ctaLabel && opts.ctaHref
      ? `<tr><td>${newsletterButton(opts.ctaHref, opts.ctaLabel)}</td></tr>`
      : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px">
      <tr><td>
        ${eyebrow}
        <h1 class="sn-h1" style="margin:0 0 12px;font-family:${emailFonts.heading};font-size:30px;line-height:38px;font-weight:600;color:${c.textPrimary};letter-spacing:-0.3px;mso-line-height-rule:exactly">${escapeHtml(opts.title)}</h1>
        ${subtitle}
      </td></tr>
      ${image}
      ${cta}
    </table>`;
}

/**
 * A standalone image, optionally linked, optionally captioned.
 *
 * `alt` is required by the type rather than optional: roughly a third of
 * recipients see the alt text and not the image, and an uncaptioned broken
 * image is the difference between a newsletter that reads fine with images off
 * and one that reads as an empty box.
 */
export function newsletterImage(opts: {
  src: string;
  alt: string;
  href?: string;
  caption?: string;
}): string {
  const img = `<img src="${escapeUrl(opts.src)}" width="${WIDTH}" alt="${escapeHtml(opts.alt)}" style="display:block;width:100%;max-width:${WIDTH}px;height:auto;border:0;outline:none;border-radius:10px" />`;
  const wrapped = opts.href ? `<a href="${escapeUrl(opts.href)}">${img}</a>` : img;
  const caption = opts.caption
    ? `<p style="margin:8px 0 0;font-family:${emailFonts.body};font-size:13px;line-height:20px;color:${c.textMuted};text-align:center;mso-line-height-rule:exactly">${escapeHtml(opts.caption)}</p>`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
      <tr><td align="center">${wrapped}${caption}</td></tr>
    </table>`;
}

/**
 * A digest entry: thumbnail, category tag, headline, excerpt, read-more link.
 *
 * Image on top rather than beside the text. A side-by-side card needs either
 * float (dead in Outlook) or a two-cell table that cannot reflow on a 320px
 * screen without `display:block` overrides Outlook then ignores — so the
 * desktop-elegant version is the one that breaks on the majority of opens.
 * Stacked is the same card, legible everywhere.
 */
export function newsletterArticleCard(opts: {
  title: string;
  href: string;
  excerpt?: string;
  imageUrl?: string;
  imageAlt?: string;
  tag?: string;
  linkLabel?: string;
}): string {
  const url = escapeUrl(opts.href);
  const image = opts.imageUrl
    ? `<tr><td style="padding:0 0 16px">
         <a href="${url}"><img src="${escapeUrl(opts.imageUrl)}" width="536" alt="${escapeHtml(opts.imageAlt ?? '')}" style="display:block;width:100%;max-width:536px;height:auto;border:0;outline:none;border-radius:8px" /></a>
       </td></tr>`
    : '';
  const tag = opts.tag
    ? `<p style="margin:0 0 8px;font-family:${emailFonts.body};font-size:11px;line-height:15px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${c.primaryLight};mso-line-height-rule:exactly">${escapeHtml(opts.tag)}</p>`
    : '';
  const excerpt = opts.excerpt
    ? `<p style="margin:0 0 12px;font-family:${emailFonts.body};font-size:15px;line-height:24px;color:${c.textSecondary};mso-line-height-rule:exactly">${escapeHtml(opts.excerpt)}</p>`
    : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.bgSubtle}" style="margin:20px 0;background:${c.bgSubtle};border:1px solid ${c.divider};border-radius:12px">
      <tr><td style="padding:20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${image}
          <tr><td>
            ${tag}
            <h3 style="margin:0 0 8px;font-family:${emailFonts.heading};font-size:20px;line-height:28px;font-weight:600;color:${c.textPrimary};mso-line-height-rule:exactly">
              <a href="${url}" style="color:${c.textPrimary};text-decoration:none">${escapeHtml(opts.title)}</a>
            </h3>
            ${excerpt}
            <a href="${url}" style="font-family:${emailFonts.body};font-size:14px;line-height:20px;font-weight:700;color:${c.primaryMain};text-decoration:none">${escapeHtml(opts.linkLabel ?? 'Read more')} &rarr;</a>
          </td></tr>
        </table>
      </td></tr>
    </table>`;
}

/** Pull quote — a testimonial or a line worth slowing the reader down for. */
export function newsletterQuote(opts: { text: string; attribution?: string }): string {
  const attribution = opts.attribution
    ? `<p style="margin:12px 0 0;font-family:${emailFonts.body};font-size:14px;line-height:20px;font-weight:600;color:${c.textMuted};mso-line-height-rule:exactly">— ${escapeHtml(opts.attribution)}</p>`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0">
      <tr>
        <td width="4" bgcolor="${c.secondaryMain}" style="width:4px;background:${c.secondaryMain};font-size:0;line-height:0">&nbsp;</td>
        <td style="padding:4px 0 4px 20px">
          <p style="margin:0;font-family:${emailFonts.heading};font-size:20px;line-height:31px;font-style:italic;color:${c.textPrimary};mso-line-height-rule:exactly">${escapeHtml(opts.text)}</p>
          ${attribution}
        </td>
      </tr>
    </table>`;
}

/**
 * Primary CTA. Same VML-backed construction as the transactional button, but
 * gold rather than teal: in a marketing context the action is the point of the
 * message, and the brand gold is the strongest thing in the palette that still
 * clears AA against white.
 */
export function newsletterButton(href: string, label: string): string {
  const url = escapeUrl(href);
  const text = escapeHtml(label);
  const vmlWidth = Math.round(label.length * 8.6) + 72;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" class="sn-btn" style="margin:28px auto">
      <tr><td align="center">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:${vmlWidth}px" arcsize="18%" stroke="f" fillcolor="${c.secondaryMain}">
          <w:anchorlock/>
          <center style="color:${c.white};font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${text}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${url}" style="display:inline-block;background:${c.secondaryMain};color:${c.white};font-family:${emailFonts.body};font-size:16px;line-height:22px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;mso-hide:all">${text}</a>
        <!--<![endif]-->
      </td></tr>
    </table>`;
}

/** Vertical breathing room. `height` is clamped to a sane range. */
export function newsletterSpacer(height = 24): string {
  const h = Math.min(Math.max(Math.round(height), 4), 96);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="${h}" style="height:${h}px;line-height:${h}px;font-size:0">&nbsp;</td></tr></table>`;
}

// ───────────────────────────────────────────────────────────────────────────
// Shell
// ───────────────────────────────────────────────────────────────────────────

/** Newsletter-only rules layered on top of the shared resets. */
function newsletterHeadStyles(): string {
  return `
    ${emailHeadStyles()}
    @media only screen and (max-width:620px) {
      .sn-h1 { font-size:26px !important; line-height:34px !important; }
      .sn-nl-pad { padding-left:20px !important; padding-right:20px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .sn-nl-surface { background:#1B1720 !important; }
      .sn-nl-text, .sn-nl-text p, .sn-nl-text h1, .sn-nl-text h2, .sn-nl-text h3 { color:#EDEAF0 !important; }
    }
    [data-ogsc] .sn-nl-surface { background:#1B1720 !important; }
    [data-ogsc] .sn-nl-text, [data-ogsc] .sn-nl-text p { color:#EDEAF0 !important; }
  `;
}

/** Masthead with a remote logo and a preferences link in the top bar. */
function newsletterMasthead(preferencesUrl: string): string {
  return `
    <tr>
      <td class="sn-logo-band sn-nl-pad" bgcolor="${c.bgPaper}" style="background:${c.bgPaper};padding:26px 32px 22px;border-radius:12px 12px 0 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="left">
              <a href="${escapeUrl(PUBLIC_SITE_URL)}" style="text-decoration:none">
                <img src="${escapeUrl(LOGO_URL)}" width="148" alt="${escapeHtml(APP_NAME)}" style="display:block;width:148px;max-width:148px;height:auto;border:0;outline:none" />
              </a>
            </td>
            <td align="right" style="font-family:${emailFonts.body};font-size:12px;line-height:18px;color:${c.textMuted}">
              <!-- Research consistently puts an opt-out affordance in the header
                   as well as the footer: a reader who wants out and cannot find
                   the link reaches for the spam button instead, which costs the
                   sending domain far more than the unsubscribe would have. -->
              <a href="${escapeUrl(preferencesUrl)}" style="color:${c.textMuted};text-decoration:underline">Email preferences</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td height="3" bgcolor="${c.secondaryMain}" style="height:3px;line-height:3px;font-size:0;background:${c.secondaryMain}">&nbsp;</td>
    </tr>`;
}

/**
 * Marketing footer.
 *
 * Every element here is load-bearing rather than decorative:
 *   * the "why you're getting this" sentence is the GDPR transparency duty and
 *     also the single best defence against a spam report from somebody who has
 *     genuinely forgotten signing up;
 *   * the legal name and postal address satisfy CAN-SPAM and the bulk-sender
 *     expectations Gmail and Yahoo enforce;
 *   * unsubscribe is a plain, unmissable link — no login, no survey, no dark
 *     pattern, because Art.7(3) requires withdrawal to be as easy as consent
 *     and because friction here converts opt-outs into complaints.
 */
function newsletterFooter(opts: {
  unsubscribeUrl: string;
  preferencesUrl: string;
  reason: string;
}): string {
  const host = PUBLIC_SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const year = new Date().getFullYear();
  const muted = `color:${c.textMuted};text-decoration:underline`;
  const socials = contact.social
    .map((s) => `<a href="${escapeUrl(s.href)}" style="${muted}">${escapeHtml(s.label)}</a>`)
    .join(`<span style="color:${c.dividerStrong}">&nbsp;&nbsp;•&nbsp;&nbsp;</span>`);

  return `
    <tr>
      <td class="sn-nl-pad" align="center" style="padding:28px 32px 8px">
        <p class="sn-footer-text" style="margin:0 0 14px;font-family:${emailFonts.body};font-size:13px;line-height:20px;color:${c.textSecondary};mso-line-height-rule:exactly">
          ${socials}
        </p>
        <p class="sn-footer-text" style="margin:0 0 12px;font-family:${emailFonts.body};font-size:12px;line-height:19px;color:${c.textMuted};mso-line-height-rule:exactly">
          ${escapeHtml(opts.reason)}
        </p>
        <p class="sn-footer-text" style="margin:0 0 12px;font-family:${emailFonts.body};font-size:13px;line-height:20px;color:${c.textMuted};mso-line-height-rule:exactly">
          <a href="${escapeUrl(opts.unsubscribeUrl)}" style="color:${c.textSecondary};text-decoration:underline;font-weight:700">Unsubscribe</a>
          <span style="color:${c.dividerStrong}">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
          <a href="${escapeUrl(opts.preferencesUrl)}" style="${muted}">Manage preferences</a>
          <span style="color:${c.dividerStrong}">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
          <a href="mailto:${contact.supportEmail}" style="${muted}">Contact us</a>
        </p>
        <p class="sn-footer-text" style="margin:0 0 4px;font-family:${emailFonts.body};font-size:12px;line-height:19px;color:${c.textMuted};mso-line-height-rule:exactly">
          ${escapeHtml(SENDER_IDENTITY.legalName)} &middot; ${escapeHtml(SENDER_IDENTITY.address)}
        </p>
        <p class="sn-footer-text" style="margin:0;font-family:${emailFonts.body};font-size:12px;line-height:19px;color:${c.textMuted};mso-line-height-rule:exactly">
          <a href="${escapeUrl(PUBLIC_SITE_URL)}" style="${muted}">${escapeHtml(host)}</a>
          &nbsp;&middot;&nbsp; &copy; ${year} ${escapeHtml(APP_NAME)}
        </p>
      </td>
    </tr>`;
}

/**
 * Wrap composed blocks in the Sinnapi newsletter shell.
 *
 * `unsubscribeUrl` and `preferencesUrl` are required arguments, not options
 * with defaults. Making them mandatory is the type system enforcing the one
 * rule that matters: there is no way to call this function and produce a
 * marketing email without a working opt-out in it.
 */
export function newsletterLayout(opts: {
  /** Subject line, reused as the document <title>. */
  subject: string;
  /** Composed block HTML. */
  body: string;
  /** Hidden inbox-preview text. Strongly recommended. */
  preheader?: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
  /** "You're receiving this because…" — audience-specific. */
  reason: string;
}): string {
  const title = escapeHtml(opts.subject);
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent">${escapeHtml(opts.preheader)}${'&#8199;&#65279;&#847; '.repeat(30)}</div>`
    : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings>
    <o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style type="text/css">${newsletterHeadStyles()}</style>
</head>
<body class="sn-body" style="margin:0;padding:0;width:100%;background:${c.bgDefault};font-family:${emailFonts.body}">
  ${preheader}
  <table role="presentation" class="sn-body-bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.bgDefault}" style="background:${c.bgDefault}">
    <tr>
      <td align="center" style="padding:32px 12px">
        <!--[if mso]><table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="sn-wrap" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${WIDTH}px;max-width:${WIDTH}px">
          ${newsletterMasthead(opts.preferencesUrl)}
          <tr>
            <td class="sn-card sn-nl-surface sn-nl-pad" bgcolor="${c.bgPaper}" style="background:${c.bgPaper};padding:34px 32px 28px;border:1px solid ${c.divider};border-top:none;border-radius:0 0 12px 12px">
              <div class="sn-nl-text">${opts.body}</div>
            </td>
          </tr>
          ${newsletterFooter({
            unsubscribeUrl: opts.unsubscribeUrl,
            preferencesUrl: opts.preferencesUrl,
            reason: opts.reason,
          })}
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain-text counterpart. Every campaign ships one: a missing `text/plain` part
 * is a meaningful spam-score penalty, and the unsubscribe URL has to be present
 * here too — a recipient reading the text part must have the same way out.
 */
export function newsletterText(opts: {
  lines: string[];
  unsubscribeUrl: string;
  preferencesUrl: string;
  reason: string;
}): string {
  const host = PUBLIC_SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return [
    ...opts.lines,
    '',
    '—',
    opts.reason,
    `Unsubscribe: ${opts.unsubscribeUrl}`,
    `Manage preferences: ${opts.preferencesUrl}`,
    '',
    `${SENDER_IDENTITY.legalName} · ${SENDER_IDENTITY.address}`,
    host,
    `(c) ${new Date().getFullYear()} ${APP_NAME}`,
  ].join('\n');
}
