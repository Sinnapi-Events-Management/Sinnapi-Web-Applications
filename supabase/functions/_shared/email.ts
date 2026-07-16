// Shared transactional-email service. Sends mail over SMTP via nodemailer,
// mirroring the benchmarked `register-staff` / vendor-application pattern.
//
// This module owns ONLY the transport + generic helpers so no Edge Function
// re-implements SMTP wiring. Per-flow content (subjects, HTML bodies) lives in
// the calling function. Sending is best-effort: callers decide whether a
// failure should block their response — `sendEmail` never throws.
//
// Required env for delivery (if any is missing, sends become no-ops that
// report `{ sent: false }` rather than crashing the caller):
//   SMTP_HOST, SMTP_USER, SMTP_PASS   — credentials
//   SMTP_PORT                         — optional, defaults to 587 (465 => TLS)
// Optional branding env (safe fallbacks below):
//   APP_NAME          — display name used in the From header, default "Sinnapi"
//   PUBLIC_SITE_URL   — public marketing/app URL, default "https://sinnapi.com"
//   EMAIL_FROM        — envelope From; defaults to SMTP_USER (many SMTP servers
//                       reject a From that doesn't match the authenticated user)
import nodemailer from 'npm:nodemailer@6';

export const APP_NAME = Deno.env.get('APP_NAME') ?? 'Sinnapi';
export const PUBLIC_SITE_URL = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://sinnapi.com';

// Sinnapi brand palette — inlined from `packages/ui/src/theme/tokens.ts`.
// Edge functions can't import the workspace UI package (the CLI bundler only
// follows relative/npm/https specifiers), so these hexes are duplicated here.
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
  bgDefault: '#FAF9FB',
  bgPaper: '#FFFFFF',
  divider: 'rgba(26,19,32,0.12)',
  white: '#FFFFFF',
} as const;

// Email-safe font stacks. tokens.ts `fonts` reference `var(--font-*)` webfonts
// that mail clients can't load, so we fall back to the same families' web-safe
// equivalents (Fraunces→serif for headings, Inter→sans for body).
export const emailFonts = {
  heading: "Georgia, 'Times New Roman', serif",
  body: 'Helvetica, Arial, sans-serif',
} as const;

/**
 * Wrap per-flow content in the shared, brand-styled Sinnapi email shell:
 * teal gradient header + gold accent bar, paper card, and a footer signed by
 * the team. All templates should compose through this so branding stays
 * consistent across flows.
 */
export function emailLayout(opts: {
  heading: string;
  body: string;
  /** Hidden inbox-preview text shown before the body in most clients. */
  preheader?: string;
}): string {
  const c = brandColors;
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${opts.preheader}</div>`
    : '';
  return `
  <div style="background:${c.bgDefault};padding:24px 12px;font-family:${emailFonts.body}">
    ${preheader}
    <div style="max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,${c.tealDeep} 0%,${c.primaryDark} 45%,${c.primaryMain} 100%);padding:36px 24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:${c.white};margin:0;font-family:${emailFonts.heading};font-size:24px;font-weight:600;letter-spacing:0.2px">${opts.heading}</h1>
      </div>
      <div style="height:4px;background:${c.secondaryMain}"></div>
      <div style="padding:32px 28px;background:${c.bgPaper};border:1px solid ${c.divider};border-top:none;border-radius:0 0 12px 12px;color:${c.textPrimary};font-size:15px;line-height:1.6">
        ${opts.body}
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid ${c.divider};color:${c.textSecondary};font-size:13px">
          <p style="margin:0">Warm regards,<br/><strong style="color:${c.primaryMain}">The ${APP_NAME} Team</strong></p>
          <p style="margin:12px 0 0"><a href="${PUBLIC_SITE_URL}" style="color:${c.primaryMain};text-decoration:none">${PUBLIC_SITE_URL.replace(/^https?:\/\//, '')}</a></p>
        </div>
      </div>
    </div>
  </div>`;
}

/** Brand-styled CTA button (table-based for Outlook compatibility). */
export function emailButton(href: string, label: string): string {
  const c = brandColors;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr><td style="border-radius:8px;background:${c.primaryMain}">
        <a href="${href}" style="display:inline-block;padding:12px 28px;color:${c.white};font-family:${emailFonts.body};font-size:15px;font-weight:600;text-decoration:none;border-radius:8px">${label}</a>
      </td></tr>
    </table>`;
}

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

// Escape user-supplied strings before interpolating into HTML email bodies.
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Lazily-built, reused across invocations warm on the same isolate.
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function buildTransporter(): ReturnType<typeof nodemailer.createTransport> | null {
  if (cachedTransporter) return cachedTransporter;

  const host = Deno.env.get('SMTP_HOST');
  const port = Number(Deno.env.get('SMTP_PORT') ?? '587');
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');

  console.log('[EMAIL] SMTP env:', {
    host: host ?? 'NOT SET',
    port,
    user: user ? `${user.slice(0, 4)}****` : 'NOT SET',
    pass: pass ? '****SET****' : 'NOT SET',
  });

  if (!host || !user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    logger: true,
    debug: true,
  });

  return cachedTransporter;
}

/**
 * Send one transactional email. Best-effort: returns `{ sent: false, error }`
 * instead of throwing, so callers can decide whether delivery is blocking.
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const recipients = Array.isArray(msg.to) ? msg.to.join(', ') : msg.to;
  console.log('[EMAIL] === sendEmail START ===');
  console.log('[EMAIL] To:', recipients, '| Subject:', msg.subject);

  const transporter = buildTransporter();
  if (!transporter) {
    console.error('[EMAIL] SMTP not configured — skipping send');
    return { sent: false, error: 'SMTP not configured' };
  }

  // Default the envelope From to the authenticated SMTP user: many servers
  // reject a mismatched From outright.
  const fromAddress = msg.from ?? Deno.env.get('EMAIL_FROM') ?? Deno.env.get('SMTP_USER')!;

  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${fromAddress}>`,
      to: msg.to,
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
      subject: msg.subject,
      ...(msg.text ? { text: msg.text } : {}),
      html: msg.html,
    });

    console.log('[EMAIL] messageId:', info.messageId, '| response:', info.response);
    console.log('[EMAIL] accepted:', JSON.stringify(info.accepted));
    console.log('[EMAIL] rejected:', JSON.stringify(info.rejected));

    if (info.rejected && info.rejected.length > 0) {
      return { sent: false, error: `SMTP server rejected: ${info.rejected.join(', ')}` };
    }
    if (!info.accepted || info.accepted.length === 0) {
      return { sent: false, error: 'No recipients accepted by SMTP server' };
    }

    console.log('[EMAIL] === sendEmail SUCCESS ===');
    return { sent: true };
  } catch (err) {
    const error = err as Error & { code?: string; responseCode?: number };
    console.error('[EMAIL] === SEND FAILED ===');
    console.error('[EMAIL] name:', error.name, '| message:', error.message);
    if (error.code) console.error('[EMAIL] code:', error.code);
    if (error.responseCode) console.error('[EMAIL] responseCode:', error.responseCode);
    return { sent: false, error: error.message };
  }
}
