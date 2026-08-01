// Email content for outbox-driven notifications. The dispatcher works in
// machine trigger keys (`booking.status`, `payment.status`, …); this module is
// the single place that turns one into recipient-facing copy, so the handler
// never emits a raw key into a subject line or body.
//
// Deep links: web-public has no per-record dashboard route yet, so every CTA
// points at the real `/sign-in` page. Once record routes exist, give each
// entry below a `path` and build the URL from the payload's aggregate id.
import {
  APP_NAME,
  PUBLIC_SITE_URL,
  emailButton,
  emailLayout,
  emailParagraph,
  emailText,
  escapeHtml,
  type EmailMessage,
} from '../_shared/emailTemplate.ts';

interface TriggerCopy {
  /** Subject line, already recipient-facing. */
  subject: string;
  /** Card headline. */
  heading: string;
  /** Lead paragraph. */
  body: string;
  /** CTA label. */
  cta: string;
}

/**
 * Copy for every trigger the dispatcher routes. KEEP IN SYNC with `ROUTES` in
 * `index.ts` — a trigger missing here falls back to generic account copy
 * rather than leaking the key.
 */
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
  'escrow.status': {
    subject: 'Update on your escrow funds',
    heading: 'Your escrow status changed',
    body: 'The escrow holding funds for your event has changed status. Sign in to review the transaction.',
    cta: 'View escrow details',
  },
  'payment.status': {
    subject: 'Update on your payment',
    heading: 'Your payment status changed',
    body: 'There has been an update to one of your payments. Sign in to review the transaction and its receipt.',
    cta: 'View my payment',
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

/** Where notification CTAs send the recipient. */
const SIGN_IN_URL = `${PUBLIC_SITE_URL.replace(/\/$/, '')}/sign-in`;

/**
 * Build the branded notification email for a trigger key. Unknown keys get
 * generic account copy — never the raw key, which is both meaningless to the
 * recipient and an unescaped-interpolation risk.
 */
export function notificationEmail(to: string, triggerKey: string): EmailMessage {
  const copy = TRIGGER_COPY[triggerKey] ?? FALLBACK;

  const text = emailText([copy.body, '', `${copy.cta}: ${SIGN_IN_URL}`]);

  const html = emailLayout({
    heading: copy.heading,
    preheader: copy.body,
    body: [emailParagraph(escapeHtml(copy.body)), emailButton(SIGN_IN_URL, copy.cta)].join('\n'),
  });

  return {
    to,
    subject: `${APP_NAME}: ${copy.subject}`,
    text,
    html,
  };
}
