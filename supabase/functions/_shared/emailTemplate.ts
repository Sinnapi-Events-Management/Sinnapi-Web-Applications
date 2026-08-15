// Sinnapi transactional-email design system: brand tokens, content blocks, and
// the branded HTML shell every email composes through.
//
// Deliberately I/O-free — this module imports nothing but the logo asset, so
// templates can be rendered and inspected outside the Edge runtime (see
// `scripts/preview-emails.mjs`). SMTP transport lives in `./email.ts`, which
// re-exports everything here so existing `_shared/email.ts` imports keep
// working.
//
// ── Email-client constraints this file is written against ──────────────────
// Outlook 2013-2021 (Windows) renders mail through the Word engine, which has
// no support for: CSS float/flex/grid, `background-image`/gradients on block
// elements, `border-radius`, `max-width`, `overflow`, or padding on <div>. The
// markup below is therefore table-based with `bgcolor`/`width` attributes as
// well as inline CSS, with VML fallbacks for the rounded CTA. Everything is
// inline-styled because Gmail strips <style> blocks from the <head> in some
// contexts; the <style> block carries only progressive enhancements
// (responsive + dark-mode) that are safe to lose.
//
// Optional branding env (safe fallbacks below):
//   APP_NAME          — display name used in headings/footer, default "Sinnapi"
//   PUBLIC_SITE_URL   — public marketing/app URL, default "https://sinnapi.com"
import { LOGO_CID, LOGO_PNG_BASE64 } from './logo.ts';

/** Read an env var without assuming a Deno global, so this module also loads
 *  under the Node-based preview harness. */
function env(key: string): string | undefined {
  return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(
    key,
  );
}

export const APP_NAME = env('APP_NAME') ?? 'Sinnapi';
export const PUBLIC_SITE_URL = env('PUBLIC_SITE_URL') ?? 'https://sinnapi.com';

// Company contact details shown in the email footer.
// Edge Functions can't import the workspace `@sinnapi/utils` package (the CLI
// bundler only follows relative/npm/https specifiers), so these are duplicated.
// KEEP IN SYNC with `packages/utils/constants.ts` -> CONTACT.
export const contact = {
  supportEmail: 'support@sinnapi.com',
  social: [
    { label: 'Instagram', href: 'https://www.instagram.com/sinnapi_inc' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/sinnapi' },
    { label: 'Facebook', href: 'https://www.facebook.com/cosmoweddings' },
  ],
} as const;

// Sinnapi brand palette — inlined from `packages/ui/src/theme/tokens.ts`.
// Same bundler constraint as `contact` above, so these hexes are duplicated.
// KEEP IN SYNC with tokens.ts `palette.light` + `gradientStops`.
export const brandColors = {
  primaryLightest: '#E2F0F1',
  primaryLighter: '#8CC3C8',
  primaryLight: '#3F9BA3',
  primaryMain: '#07504D',
  primaryDark: '#053837',
  tealDeep: '#042E2C', // gradientStops.tealDeep — hero overlay start
  secondaryLightest: '#FEF8E8',
  secondaryMain: '#c8973a', // AA-safe brand gold
  secondaryDark: '#a2770a',
  gold: '#B9890F', // gradientStops.gold — vendor CTA
  textPrimary: '#1A1320',
  textSecondary: '#5C5468',
  textMuted: '#7C7488',
  bgDefault: '#FAF9FB',
  bgPaper: '#FFFFFF',
  bgSubtle: '#F4F2F6',
  divider: '#E6E3EB', // opaque equivalent of tokens' rgba(26,19,32,0.12)
  dividerStrong: '#D5D1DC',
  white: '#FFFFFF',
} as const;

// Email-safe font stacks. tokens.ts `fonts` reference `var(--font-*)` webfonts
// that mail clients can't load, so we fall back to the same families' web-safe
// equivalents (Fraunces→serif for headings, Inter→sans for body).
export const emailFonts = {
  heading: "Georgia, 'Times New Roman', Times, serif",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace",
} as const;

/** Content width of the email card, in px. 600 is the safe universal max. */
const WIDTH = 600;

// ───────────────────────────────────────────────────────────────────────────
// Escaping
// ───────────────────────────────────────────────────────────────────────────

/** Escape user-supplied strings before interpolating into HTML email bodies. */
export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape a URL for use in an `href`. Anchors it to http(s)/mailto/tel so an
 * attacker-controlled value can't smuggle in `javascript:` or `data:`.
 */
export function escapeUrl(url: string): string {
  const trimmed = String(url).trim();
  return /^(https?:|mailto:|tel:)/i.test(trimmed) ? escapeHtml(trimmed) : '#';
}

// ───────────────────────────────────────────────────────────────────────────
// Content blocks — compose these into `emailLayout({ body })`
// ───────────────────────────────────────────────────────────────────────────

const c = brandColors;

/** Base paragraph style, reused by the block helpers below. */
const P_STYLE =
  `margin:0 0 16px;font-family:${emailFonts.body};font-size:16px;` +
  `line-height:26px;color:${c.textPrimary};mso-line-height-rule:exactly`;

/** A body paragraph. Pass pre-escaped HTML (inline <strong>/<a> are fine). */
export function emailParagraph(html: string): string {
  return `<p style="${P_STYLE}">${html}</p>`;
}

/** A section heading that breaks up long bodies. */
export function emailHeading(text: string): string {
  return (
    `<h2 style="margin:32px 0 12px;font-family:${emailFonts.heading};font-size:19px;` +
    `line-height:26px;font-weight:600;color:${c.primaryMain};mso-line-height-rule:exactly">` +
    `${escapeHtml(text)}</h2>`
  );
}

/** Hairline rule for separating sections inside the card. */
export function emailDivider(): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:28px 0"><tr><td height="1" bgcolor="${c.divider}" ` +
    `style="height:1px;line-height:1px;font-size:0;background:${c.divider}">&nbsp;</td></tr></table>`
  );
}

/**
 * Numbered or bulleted list. Rendered as a table rather than <ol>/<ul> because
 * Outlook and Gmail disagree wildly on list indentation and marker styling.
 */
export function emailList(items: string[], opts: { ordered?: boolean } = {}): string {
  const rows = items
    .map((item, i) => {
      const marker = opts.ordered
        ? `<span style="display:inline-block;width:24px;height:24px;line-height:24px;` +
          `background:${c.primaryLightest};color:${c.primaryMain};border-radius:12px;` +
          `text-align:center;font-size:13px;font-weight:700">${i + 1}</span>`
        : `<span style="display:inline-block;width:6px;height:6px;background:${c.primaryLight};` +
          `border-radius:3px;font-size:0;line-height:6px">&nbsp;</span>`;
      const markerCell = opts.ordered
        ? `padding:0 12px 12px 0;width:24px;vertical-align:top`
        : `padding:9px 12px 12px 0;width:6px;vertical-align:top`;
      return `<tr>
        <td style="${markerCell}">${marker}</td>
        <td style="padding:0 0 12px;font-family:${emailFonts.body};font-size:16px;line-height:24px;color:${c.textPrimary};mso-line-height-rule:exactly">${item}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px">${rows}</table>`;
}

/**
 * Key/value detail table — the standard way to present record data
 * (references, credentials, applicant details) in a Sinnapi email.
 * Values are escaped; pass `raw: true` on a row to inject prepared HTML
 * such as `emailCredential(...)`.
 */
export function emailDataTable(
  rows: Array<{ label: string; value: string; raw?: boolean }>,
): string {
  const body = rows
    .map(({ label, value, raw }, i) => {
      const last = i === rows.length - 1;
      const border = last ? '' : `border-bottom:1px solid ${c.divider};`;
      return `<tr>
        <td width="38%" style="${border}padding:14px 18px;font-family:${emailFonts.body};font-size:13px;line-height:18px;font-weight:600;color:${c.textSecondary};text-transform:uppercase;letter-spacing:0.6px;vertical-align:top;mso-line-height-rule:exactly">${escapeHtml(label)}</td>
        <td style="${border}padding:14px 18px;font-family:${emailFonts.body};font-size:16px;line-height:24px;color:${c.textPrimary};vertical-align:top;mso-line-height-rule:exactly">${raw ? value : escapeHtml(value)}</td>
      </tr>`;
    })
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.bgSubtle}" style="margin:24px 0;background:${c.bgSubtle};border:1px solid ${c.divider};border-radius:10px">
      ${body}
    </table>`;
}

/**
 * Monospace chip for a value the recipient must read character-by-character —
 * a temporary password or reference code. Wide letter-spacing and a boxed
 * background make ambiguous glyphs (l/1/I, 0/O) easier to transcribe.
 */
export function emailCredential(value: string): string {
  return (
    `<span style="display:inline-block;font-family:${emailFonts.mono};font-size:17px;` +
    `line-height:24px;font-weight:700;letter-spacing:1.5px;color:${c.primaryDark};` +
    `background:${c.white};border:1px solid ${c.dividerStrong};border-radius:6px;` +
    `padding:8px 14px;mso-line-height-rule:exactly">${escapeHtml(value)}</span>`
  );
}

type PanelTone = 'info' | 'security' | 'success';

const PANEL_TONES: Record<PanelTone, { bg: string; border: string; accent: string; text: string }> =
  {
    info: {
      bg: c.primaryLightest,
      border: c.primaryLighter,
      accent: c.primaryMain,
      text: c.primaryDark,
    },
    security: {
      bg: c.secondaryLightest,
      border: '#EBD9A8',
      accent: c.secondaryDark,
      text: '#6B4E06',
    },
    success: {
      bg: '#E8F5EC',
      border: '#A9D8BA',
      accent: '#1B7A45',
      text: '#14532D',
    },
  };

/**
 * Callout panel with a left accent bar — used for security notices and
 * "no action needed" reassurances. Built as a nested table so the accent bar
 * survives Outlook (which drops `border-left` on <div>).
 */
export function emailPanel(opts: { tone?: PanelTone; title?: string; body: string }): string {
  const t = PANEL_TONES[opts.tone ?? 'info'];
  const title = opts.title
    ? `<p style="margin:0 0 6px;font-family:${emailFonts.body};font-size:14px;line-height:20px;font-weight:700;color:${t.accent};text-transform:uppercase;letter-spacing:0.6px;mso-line-height-rule:exactly">${escapeHtml(opts.title)}</p>`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.bg}" style="margin:24px 0;background:${t.bg};border:1px solid ${t.border};border-radius:10px">
      <tr>
        <td width="4" bgcolor="${t.accent}" style="width:4px;background:${t.accent};font-size:0;line-height:0">&nbsp;</td>
        <td style="padding:16px 18px">
          ${title}
          <p style="margin:0;font-family:${emailFonts.body};font-size:15px;line-height:23px;color:${t.text};mso-line-height-rule:exactly">${opts.body}</p>
        </td>
      </tr>
    </table>`;
}

/**
 * Primary CTA button. Table-based with a VML `roundrect` fallback so Outlook
 * renders a real rounded, filled button rather than a bare link.
 */
export function emailButton(
  href: string,
  label: string,
  opts: { variant?: 'primary' | 'secondary' } = {},
): string {
  const secondary = opts.variant === 'secondary';
  const fill = secondary ? c.white : c.primaryMain;
  const fg = secondary ? c.primaryMain : c.white;
  const url = escapeUrl(href);
  const text = escapeHtml(label);
  // VML has no auto-width, so approximate it from the label length.
  const vmlWidth = Math.round(label.length * 8.6) + 64;
  const border = secondary ? `border:1px solid ${c.primaryMain};` : '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto">
      <tr><td align="center">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:${vmlWidth}px" arcsize="18%" ${secondary ? `strokecolor="${c.primaryMain}" fillcolor="${c.white}"` : `stroke="f" fillcolor="${c.primaryMain}"`}>
          <w:anchorlock/>
          <center style="color:${fg};font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${text}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${url}" style="display:inline-block;background:${fill};${border}color:${fg};font-family:${emailFonts.body};font-size:16px;line-height:20px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;mso-hide:all">${text}</a>
        <!--<![endif]-->
      </td></tr>
    </table>`;
}

/**
 * Fallback link shown under a CTA so recipients whose client mangles the
 * button (or who need to copy the URL into another browser) can still proceed.
 */
export function emailFallbackLink(href: string): string {
  const url = escapeUrl(href);
  return (
    `<p style="margin:0 0 4px;font-family:${emailFonts.body};font-size:13px;line-height:20px;` +
    `color:${c.textMuted};text-align:center;mso-line-height-rule:exactly">` +
    `Button not working? Copy and paste this link into your browser:<br/>` +
    `<a href="${url}" style="color:${c.primaryMain};text-decoration:underline;word-break:break-all">${url}</a></p>`
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Layout shell
// ───────────────────────────────────────────────────────────────────────────

/**
 * Progressive enhancements only. Gmail strips <style> in forwarded/clipped
 * messages, so nothing structural may live here — every rule below is a
 * refinement on top of markup that already renders correctly without it.
 *
 * Exported because `./newsletterTemplate.ts` builds a second shell (marketing
 * rather than transactional) and must inherit exactly these resets. A forked
 * copy would drift, and the drift would only ever show up in somebody's Outlook.
 */
export function emailHeadStyles(): string {
  return `
    /* Client resets */
    body { margin:0 !important; padding:0 !important; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse !important; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { text-decoration:none; }
    /* iOS auto-links dates/addresses in a colour we don't control */
    a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; font-size:inherit !important; font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important; }

    /* Small screens */
    @media only screen and (max-width:620px) {
      .sn-wrap { width:100% !important; }
      .sn-pad { padding-left:24px !important; padding-right:24px !important; }
      .sn-head-pad { padding-top:28px !important; padding-bottom:24px !important; }
      .sn-h1 { font-size:24px !important; line-height:32px !important; }
      .sn-stack { display:block !important; width:100% !important; }
      .sn-btn a { display:block !important; }
    }

    /* Dark mode. The brand lockup always sits on white — a dark-teal wordmark
       on an inverted dark panel would be unreadable — so the logo band and the
       card keep light surfaces while text and chrome are re-tuned. */
    @media (prefers-color-scheme: dark) {
      .sn-body, .sn-body-bg { background:#121016 !important; }
      .sn-card { background:${c.bgPaper} !important; }
      .sn-logo-band { background:${c.white} !important; }
      .sn-footer-text, .sn-footer-text a { color:#9A93A6 !important; }
    }
    /* Outlook.com dark mode uses [data-ogsc] rather than the media query */
    [data-ogsc] .sn-body-bg { background:#121016 !important; }
    [data-ogsc] .sn-card, [data-ogsc] .sn-logo-band { background:${c.bgPaper} !important; }
    [data-ogsc] .sn-footer-text, [data-ogsc] .sn-footer-text a { color:#9A93A6 !important; }
  `;
}

/** Masthead: brand lockup on white with the brand-teal accent rule beneath. */
function masthead(): string {
  return `
    <tr>
      <td class="sn-logo-band sn-head-pad" align="center" bgcolor="${c.bgPaper}" style="background:${c.bgPaper};padding:34px 32px 28px;border-radius:12px 12px 0 0">
        <a href="${escapeUrl(PUBLIC_SITE_URL)}" style="text-decoration:none">
          <img src="cid:${LOGO_CID}" width="168" alt="${escapeHtml(APP_NAME)}" style="display:block;width:168px;max-width:168px;height:auto;border:0;outline:none" />
        </a>
      </td>
    </tr>
    <tr>
      <td height="3" bgcolor="${c.primaryMain}" style="height:3px;line-height:3px;font-size:0;background:${c.primaryMain}">&nbsp;</td>
    </tr>`;
}

/** Footer: support contact, socials, and the transactional-mail notice. */
function footer(): string {
  const host = PUBLIC_SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const year = new Date().getFullYear();
  const linkStyle = `color:${c.textSecondary};text-decoration:underline`;
  const socials = contact.social
    .map((s) => `<a href="${escapeUrl(s.href)}" style="${linkStyle}">${escapeHtml(s.label)}</a>`)
    .join(`<span style="color:${c.dividerStrong}">&nbsp;&nbsp;•&nbsp;&nbsp;</span>`);

  return `
    <tr>
      <td class="sn-pad" align="center" style="padding:28px 32px 8px">
        <p class="sn-footer-text" style="margin:0 0 10px;font-family:${emailFonts.body};font-size:14px;line-height:22px;color:${c.textSecondary};mso-line-height-rule:exactly">
          Need help? Email us at
          <a href="mailto:${contact.supportEmail}" style="color:${c.primaryMain};text-decoration:underline;font-weight:600">${contact.supportEmail}</a>
        </p>
        <p class="sn-footer-text" style="margin:0 0 16px;font-family:${emailFonts.body};font-size:14px;line-height:22px;color:${c.textSecondary};mso-line-height-rule:exactly">
          ${socials}
        </p>
        <p class="sn-footer-text" style="margin:0 0 6px;font-family:${emailFonts.body};font-size:13px;line-height:20px;color:${c.textMuted};mso-line-height-rule:exactly">
          <a href="${escapeUrl(PUBLIC_SITE_URL)}" style="${linkStyle}">${escapeHtml(host)}</a>
        </p>
        <p class="sn-footer-text" style="margin:0 0 6px;font-family:${emailFonts.body};font-size:12px;line-height:19px;color:${c.textMuted};mso-line-height-rule:exactly">
          This is an automated service message about your ${escapeHtml(APP_NAME)} account. It is not marketing email, so there is nothing to unsubscribe from.
        </p>
        <p class="sn-footer-text" style="margin:0;font-family:${emailFonts.body};font-size:12px;line-height:19px;color:${c.textMuted};mso-line-height-rule:exactly">
          &copy; ${year} ${escapeHtml(APP_NAME)}. All rights reserved.
        </p>
      </td>
    </tr>`;
}

/**
 * Wrap per-flow content in the shared Sinnapi email shell: white masthead with
 * the brand lockup, teal accent rule, white content card, and a footer with
 * support + social links.
 *
 * Emits a complete HTML document (DOCTYPE, <head>, meta) — mail clients that
 * receive a bare fragment inject their own defaults, which is where most
 * cross-client rendering drift comes from.
 *
 * All templates should compose through this so branding stays consistent.
 */
export function emailLayout(opts: {
  /** Headline rendered at the top of the card. */
  heading: string;
  /** Body HTML — compose with the block helpers above. */
  body: string;
  /** Hidden inbox-preview text shown next to the subject in most clients. */
  preheader?: string;
  /** <title> for the document; defaults to the heading. */
  title?: string;
}): string {
  const title = escapeHtml(opts.title ?? opts.heading);
  // Trailing entities pad the preview so the client doesn't pull body copy in
  // after it. Kept in a zero-height, zero-opacity block that no client renders.
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
  <style type="text/css">${emailHeadStyles()}</style>
</head>
<body class="sn-body" style="margin:0;padding:0;width:100%;background:${c.bgDefault};font-family:${emailFonts.body}">
  ${preheader}
  <table role="presentation" class="sn-body-bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.bgDefault}" style="background:${c.bgDefault}">
    <tr>
      <td align="center" style="padding:32px 12px">
        <!--[if mso]><table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="sn-wrap" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${WIDTH}px;max-width:${WIDTH}px">
          ${masthead()}
          <tr>
            <td class="sn-card sn-pad" bgcolor="${c.bgPaper}" style="background:${c.bgPaper};padding:36px 40px 32px;border:1px solid ${c.divider};border-top:none;border-radius:0 0 12px 12px">
              <h1 class="sn-h1" style="margin:0 0 20px;font-family:${emailFonts.heading};font-size:27px;line-height:36px;font-weight:600;color:${c.textPrimary};letter-spacing:-0.2px;mso-line-height-rule:exactly">${escapeHtml(opts.heading)}</h1>
              ${opts.body}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0">
                <tr><td height="1" bgcolor="${c.divider}" style="height:1px;line-height:1px;font-size:0;background:${c.divider}">&nbsp;</td></tr>
                <tr><td style="padding:20px 0 0;font-family:${emailFonts.body};font-size:15px;line-height:23px;color:${c.textSecondary};mso-line-height-rule:exactly">
                  Warm regards,<br/>
                  <strong style="color:${c.primaryMain}">The ${escapeHtml(APP_NAME)} Team</strong>
                </td></tr>
              </table>
            </td>
          </tr>
          ${footer()}
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ───────────────────────────────────────────────────────────────────────────
// Plain-text counterpart
// ───────────────────────────────────────────────────────────────────────────

/**
 * Build the plain-text alternative with the same sign-off and footer the HTML
 * shell renders. Every template must ship one: a missing `text/plain` part is
 * a meaningful spam-score penalty, and it's the only version some clients and
 * screen readers show.
 */
export function emailText(lines: Array<string>): string {
  const host = PUBLIC_SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return [
    ...lines,
    '',
    'Warm regards,',
    `The ${APP_NAME} Team`,
    '',
    '—',
    `Need help? Email ${contact.supportEmail}`,
    host,
    `This is an automated service message about your ${APP_NAME} account.`,
    `(c) ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`,
  ].join('\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Message contract
// ───────────────────────────────────────────────────────────────────────────

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Override the From header. Defaults to EMAIL_FROM/SMTP_USER. */
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  sent: boolean;
  error?: string;
}

/** Re-exported so the transport layer can attach the logo by Content-ID. */
export { LOGO_CID, LOGO_PNG_BASE64 };
