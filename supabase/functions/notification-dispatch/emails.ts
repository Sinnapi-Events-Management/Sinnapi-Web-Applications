// Email content for outbox-driven notifications.
//
// Two paths converge here:
//
//   * Templated triggers (everything escrow and payment related) carry their
//     copy in `notification_templates`, so Support can reword without a
//     deploy. `templatedEmail` wraps that copy in the branded shell.
//   * Legacy `*.status` triggers still use the static table below.
//
// Either way the dispatcher never emits a raw trigger key into a subject line
// or body — it is meaningless to the recipient and an interpolation risk.
import {
  APP_NAME,
  PUBLIC_SITE_URL,
  emailButton,
  emailDataTable,
  emailHeading,
  emailLayout,
  emailPanel,
  emailParagraph,
  emailText,
  escapeHtml,
  type EmailMessage,
} from '../_shared/emailTemplate.ts';

interface TriggerCopy {
  subject: string;
  heading: string;
  body: string;
  cta: string;
}

const TRIGGER_COPY: Record<string, TriggerCopy> = {
  'vendor.application.status': {
    subject: 'Update on your vendor application',
    heading: 'Your vendor application was updated',
    body: 'There has been an update to your vendor application. Sign in to see its current status and any next steps.',
    cta: 'View my application',
  },
  'booking.status': {
    subject: 'Update on your booking',
    heading: 'Your booking was updated',
    body: 'The status of one of your bookings has changed. Sign in to review the latest details.',
    cta: 'View my booking',
  },
  'quote.status': {
    subject: 'Update on your quotation',
    heading: 'Your quotation was updated',
    body: 'A quotation you are involved in has been updated. Sign in to review the terms and respond.',
    cta: 'View my quotation',
  },
  'subscription.status': {
    subject: 'Update on your subscription',
    heading: 'Your subscription was updated',
    body: 'Your subscription plan or billing status has changed. Sign in to review your current plan.',
    cta: 'View my subscription',
  },
  'review.new': {
    subject: 'You have a new review',
    heading: 'You received a new review',
    body: 'Someone has left a new review. Sign in to read it and reply.',
    cta: 'Read the review',
  },
  'event.interest': {
    subject: 'New interest in your event',
    heading: 'Someone is interested in your event',
    body: 'A new expression of interest has been registered for your event. Sign in to see who and respond.',
    cta: 'View the interest',
  },
  'message.new': {
    subject: 'You have a new message',
    heading: 'You have a new message',
    body: 'A new message is waiting for you. Sign in to read it and reply.',
    cta: 'Read the message',
  },
};

const FALLBACK: TriggerCopy = {
  subject: 'Update on your account',
  heading: 'There is an update on your account',
  body: 'Something on your account has changed. Sign in to see the latest details.',
  cta: 'Sign in',
};

const SIGN_IN_URL = `${PUBLIC_SITE_URL.replace(/\/$/, '')}/sign-in`;

/**
 * Read an env var without assuming a Deno global.
 *
 * Same guard as `_shared/emailTemplate.ts`. This module is I/O-free content
 * only, and `scripts/preview-emails.mjs` loads it under Node to render every
 * template to disk — a bare `Deno.env` reference at module scope throws there
 * on import and takes the whole preview run down with it, not just this file's
 * templates.
 */
function env(key: string): string | undefined {
  return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(
    key,
  );
}

/** Portal roots, so a money email can link straight at the thing it is about. */
const PORTAL_URL: Record<string, string> = {
  client: (env('CLIENT_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(/\/$/, ''),
  vendor: (env('VENDOR_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(/\/$/, ''),
  admin: (env('ADMIN_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(/\/$/, ''),
};

/**
 * Where a given audience should land for the event. Clients and vendors care
 * about the booking; Finance cares about the escrow record itself.
 *
 * Ordered most-specific-first, and every branch names a route that actually
 * exists in the portal it points at: only the admin portal has `/escrow/:id`,
 * and the two consumer portals reach an escrow through its booking.
 */
export function deepLink(audience: string, payload: Record<string, unknown>): string {
  const root = PORTAL_URL[audience] ?? PUBLIC_SITE_URL;
  const id = (key: string) => {
    const value = payload[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  };

  // Settlement steps are acted on from the booking in every portal, admin
  // included — the console's forward and release controls live on that page,
  // not on the escrow register. Checked before the escrow branch, which would
  // otherwise send an operator to a read-only row and leave them hunting.
  const settlementId = id('settlement_id');
  const bookingForSettlement = id('booking_id');
  if (settlementId && bookingForSettlement) return `${root}/bookings/${bookingForSettlement}`;

  const escrowId = id('escrow_id');
  if (audience === 'admin' && escrowId) return `${root}/escrow/${escrowId}`;

  // Subscription events. A vendor has one subscription page; the console
  // has one page per subscription. Checked before the booking branch because
  // a subscription payload never carries a booking id, and after the escrow
  // one so an escrow payload's vendor_id cannot be mistaken for this.
  const subscriptionId = id('subscription_id');
  if (subscriptionId) {
    return audience === 'admin'
      ? `${root}/subscriptions/${subscriptionId}`
      : `${root}/subscription`;
  }

  const bookingId = id('booking_id');
  if (bookingId) return `${root}/bookings/${bookingId}`;

  const quotationId = id('quotation_id');
  if (quotationId) return `${root}/quotations/${quotationId}`;

  const conversationId = id('conversation_id');
  if (conversationId) return `${root}/messages/${conversationId}`;

  return `${root}/`;
}

export function notificationEmail(to: string, triggerKey: string): EmailMessage {
  const copy = TRIGGER_COPY[triggerKey] ?? FALLBACK;
  const text = emailText([copy.body, '', `${copy.cta}: ${SIGN_IN_URL}`]);
  const html = emailLayout({
    heading: copy.heading,
    preheader: copy.body,
    body: [emailParagraph(escapeHtml(copy.body)), emailButton(SIGN_IN_URL, copy.cta)].join('\n'),
  });
  return { to, subject: `${APP_NAME}: ${copy.subject}`, text, html };
}

/**
 * Wrap already-rendered template copy in the branded shell.
 *
 * The body arrives as plain text with newlines (that is what a Support user
 * types into the template editor), so it is escaped and split into paragraphs
 * rather than being trusted as HTML.
 */
export function templatedEmail(opts: {
  to: string;
  subject: string;
  body: string;
  ctaUrl: string;
  ctaLabel: string;
  facts?: Array<[string, string]>;
  /**
   * Set only where answering the mail is a sensible way to act on it — the
   * support-desk copies, whose payload names the person who wrote in. Most
   * notifications are machine-sent state changes with nobody to reply to.
   */
  replyTo?: string;
}): EmailMessage {
  const paragraphs = opts.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks = [
    ...paragraphs.map((p) => emailParagraph(escapeHtml(p).replace(/\n/g, '<br />'))),
    ...(opts.facts?.length
      ? [emailDataTable(opts.facts.map(([k, v]) => ({ label: k, value: v })))]
      : []),
    emailButton(opts.ctaUrl, opts.ctaLabel),
  ];

  return {
    to: opts.to,
    subject: `${APP_NAME}: ${opts.subject}`,
    text: emailText([...paragraphs, '', `${opts.ctaLabel}: ${opts.ctaUrl}`]),
    html: emailLayout({
      heading: opts.subject,
      preheader: paragraphs[0] ?? opts.subject,
      body: blocks.join('\n'),
    }),
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  };
}

// ── Support desk: an inbound message from a client or vendor ──────────────
/**
 * The facts a support message carries, as `tg_message_notify` emits them on a
 * `message.support_inbox` outbox row. Everything but the identity of the
 * sender and the message itself is optional, because a support thread can be
 * opened by an account with no phone on file and a client thread has no
 * business attached at all.
 */
export interface SupportMessageNotice {
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  senderReference?: string;
  /** 'Client' | 'Vendor' — which queue the thread was opened in. */
  senderKindLabel?: string;
  businessName?: string;
  threadSubject?: string;
  message: string;
  /** Admin-portal link to the thread, so the reply happens on the record. */
  threadUrl: string;
}

/**
 * The copy that goes to the support desk, addressed to whatever
 * `SUPPORT_MESSAGES_INBOX` resolves to — one mailbox or several.
 *
 * Deliberately not template-driven, unlike the operator's own copy: this is
 * the triage email, it is the one an operator reads instead of opening the
 * portal, and it carries the message WHOLE together with every identifier
 * needed to look the account up. `notification_templates` is for copy Support
 * rewords; a facts table is not copy.
 */
export function supportMessageInboxEmail(
  to: string | string[],
  n: SupportMessageNotice,
): EmailMessage {
  const rows = [
    { label: 'From', value: n.senderName },
    ...(n.senderKindLabel ? [{ label: 'Account', value: n.senderKindLabel }] : []),
    ...(n.businessName ? [{ label: 'Business', value: n.businessName }] : []),
    ...(n.senderEmail ? [{ label: 'Email', value: n.senderEmail }] : []),
    ...(n.senderPhone ? [{ label: 'Phone', value: n.senderPhone }] : []),
    ...(n.senderReference ? [{ label: 'Reference', value: n.senderReference }] : []),
    ...(n.threadSubject ? [{ label: 'Thread', value: n.threadSubject }] : []),
  ];

  // The sender typed plain text into a chat box, so newlines are the only
  // structure it has. Escaped first, then turned back into line breaks — a
  // message quoting HTML must read as what they typed, not render as markup.
  const messageHtml = escapeHtml(n.message.trim()).replace(/\r?\n/g, '<br />');

  const replyNote = n.senderEmail
    ? 'Replying to this email reaches the sender directly. Answering in the admin portal instead keeps the reply in their support thread, where they will look for it.'
    : 'Answer in the admin portal — this account has no email address on file, so the thread is the only way to reach them.';

  const text = emailText([
    `${n.senderName} has written to ${APP_NAME} support.`,
    '',
    ...rows.map((r) => `  ${r.label}: ${r.value}`),
    '',
    'Message:',
    n.message.trim(),
    '',
    replyNote,
    '',
    `Open the thread: ${n.threadUrl}`,
  ]);

  const html = emailLayout({
    heading: 'New support message',
    preheader: `${n.senderName}: ${n.message.trim().slice(0, 90)}`,
    body: [
      emailParagraph(
        `<strong>${escapeHtml(n.senderName)}</strong> has written to ${escapeHtml(APP_NAME)} support.`,
      ),
      emailDataTable(rows),
      emailHeading('Message'),
      emailPanel({ tone: 'info', body: messageHtml }),
      emailParagraph(escapeHtml(replyNote)),
      emailButton(n.threadUrl, 'Open the thread'),
    ].join('\n'),
  });

  return {
    to,
    subject: `Support: ${n.senderName}${n.senderKindLabel ? ` (${n.senderKindLabel})` : ''}`,
    text,
    html,
    // Let the desk reply straight to the person who asked, exactly as the
    // vendor-application internal notice does.
    ...(n.senderEmail ? { replyTo: n.senderEmail } : {}),
  };
}
