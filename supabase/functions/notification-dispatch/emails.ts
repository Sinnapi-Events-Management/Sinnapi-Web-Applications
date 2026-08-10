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
  emailLayout,
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

/** Portal roots, so a money email can link straight at the thing it is about. */
const PORTAL_URL: Record<string, string> = {
  client: (Deno.env.get('CLIENT_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(/\/$/, ''),
  vendor: (Deno.env.get('VENDOR_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(/\/$/, ''),
  admin: (Deno.env.get('ADMIN_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(/\/$/, ''),
};

/**
 * Where a given audience should land for an escrow event. Clients and vendors
 * care about the booking; Finance cares about the escrow record itself.
 */
export function deepLink(audience: string, payload: Record<string, unknown>): string {
  const root = PORTAL_URL[audience] ?? PUBLIC_SITE_URL;
  const bookingId = payload.booking_id as string | undefined;
  const escrowId = payload.escrow_id as string | undefined;

  if (audience === 'admin' && escrowId) return `${root}/escrow/${escrowId}`;
  if (bookingId) return `${root}/bookings/${bookingId}`;
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
  };
}
