// Shared transactional-email transport. Sends mail over SMTP via nodemailer and
// attaches the Sinnapi brand logo inline so it renders even in clients that
// block remote images.
//
// This module owns ONLY the transport. The branded HTML shell and all content
// blocks live in `./emailTemplate.ts` and are re-exported here, so existing
// `_shared/email.ts` imports keep working and no Edge Function re-implements
// SMTP wiring. Per-flow content (subjects, bodies) lives in each function's own
// `emails.ts`. Sending is best-effort: callers decide whether a failure should
// block their response — `sendEmail` never throws.
//
// Required env for delivery (if any is missing, sends become no-ops that
// report `{ sent: false }` rather than crashing the caller):
//   SMTP_HOST, SMTP_USER, SMTP_PASS   — credentials
//   SMTP_PORT                         — optional, defaults to 587 (465 => TLS)
//   SMTP_SERVERNAME                   — optional. The name the server's TLS
//                       certificate must be valid for, when that differs from
//                       SMTP_HOST. Needed on shared hosting, where `mail.<domain>`
//                       serves the hosting provider's own wildcard certificate
//                       and verification otherwise fails with `NotValidForName`
//                       before AUTH is attempted. Setting it selects which
//                       identity is verified; it does not disable verification.
//                       Mirrors NEWSLETTER_SMTP_SERVERNAME — see
//                       `./campaignSmtp.ts` for the full rationale.
// Optional branding env (see `./emailTemplate.ts`):
//   APP_NAME, PUBLIC_SITE_URL
//   EMAIL_FROM        — envelope From; defaults to SMTP_USER (many SMTP servers
//                       reject a From that doesn't match the authenticated user)
import nodemailer from 'npm:nodemailer@6';
import { APP_NAME, LOGO_CID, LOGO_PNG_BASE64 } from './emailTemplate.ts';
import type { EmailMessage, EmailResult } from './emailTemplate.ts';

// The design system is part of this module's public surface: callers import
// `emailLayout`, `brandColors`, etc. from `_shared/email.ts` as before.
export * from './emailTemplate.ts';

// ───────────────────────────────────────────────────────────────────────────
// Transport
// ───────────────────────────────────────────────────────────────────────────

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

  const servername = Deno.env.get('SMTP_SERVERNAME')?.trim() || undefined;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Only set when configured, so the default stays "verify against the host
    // we dialled".
    //
    // `rejectUnauthorized: false` was here and was inert: the Edge Runtime's
    // Deno rejects a certificate-name mismatch inside the rustls handshake, so
    // the Node-compat layer that reads the flag never runs. It bought nothing
    // and advertised that this transport would accept a forged certificate for
    // password-reset mail, so it is gone. A name mismatch is fixed by naming
    // the right certificate above.
    ...(servername ? { tls: { servername } } : {}),
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
 *
 * The brand logo is attached inline (Content-ID) whenever the HTML references
 * it, so it renders even in clients that block remote images.
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

  // Only pay the ~9 KB attachment cost when the template actually renders it.
  const attachments = msg.html.includes(`cid:${LOGO_CID}`)
    ? [
        {
          filename: 'sinnapi-logo.png',
          content: LOGO_PNG_BASE64,
          encoding: 'base64' as const,
          cid: LOGO_CID,
          contentType: 'image/png',
          contentDisposition: 'inline' as const,
        },
      ]
    : undefined;

  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${fromAddress}>`,
      to: msg.to,
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
      subject: msg.subject,
      ...(msg.text ? { text: msg.text } : {}),
      html: msg.html,
      ...(attachments ? { attachments } : {}),
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
