// Consent-lifecycle email content, shared by every function that can create a
// marketing subscription.
//
// Lives in `_shared` rather than beside one handler because the double opt-in
// confirmation is sent from more than one place — client registration today,
// and any future surface that captures an opt-in — and two copies of the same
// message would drift in exactly the way that makes a consent trail arguable:
// `marketing_subscriptions.consent_text` records what somebody was shown, so
// the mail that asks them to confirm it must say the same thing everywhere.
//
// Sent over SMTP through `_shared/email.ts`, NOT through Resend. This is a
// one-to-one message answering an action the recipient just took, and it is the
// message that establishes consent — sending it down the bulk pipe would mean a
// deliverability problem on the marketing domain could stop anybody from ever
// confirming a subscription.
import {
  APP_NAME,
  PUBLIC_SITE_URL,
  emailButton,
  emailFallbackLink,
  emailLayout,
  emailPanel,
  emailParagraph,
  emailText,
  escapeHtml,
  type EmailMessage,
} from './emailTemplate.ts';

export type MarketingTopic = 'client_updates' | 'vendor_updates';

/** Human label for a topic, used in copy and in the preference centre. */
export function topicLabel(topic: MarketingTopic): string {
  return topic === 'vendor_updates' ? 'Vendor updates' : 'Client updates';
}

/** One line describing what a topic actually delivers. */
export function topicDescription(topic: MarketingTopic): string {
  return topic === 'vendor_updates'
    ? 'Business tips, platform news and opportunities for vendors listed on Sinnapi.'
    : 'Planning tips, featured vendors and occasional offers for people planning events.';
}

/** Where a confirmation link points. */
export function confirmSubscriptionUrl(token: string): string {
  return `${PUBLIC_SITE_URL.replace(/\/$/, '')}/subscription/confirm?t=${encodeURIComponent(token)}`;
}

/**
 * Double opt-in confirmation.
 *
 * Deliberately narrow: one action, no marketing content, and an explicit "do
 * nothing" instruction for somebody whose address was entered by another
 * person. That last line is the whole point of double opt-in — the message goes
 * to the address itself, so the person who controls it gets the final say, and
 * they must be told that ignoring it is a complete answer.
 *
 * The email carries no unsubscribe footer because there is nothing yet to
 * unsubscribe from: the subscription is `pending` and expires on its own if the
 * link is never clicked.
 */
export function confirmSubscriptionEmail(opts: {
  fullName?: string | null;
  email: string;
  topic: MarketingTopic;
  confirmUrl: string;
  expiryDays: number;
}): EmailMessage {
  const firstName = (opts.fullName ?? '').split(/\s+/)[0] || 'there';
  const label = topicLabel(opts.topic);
  const opening =
    `You asked to receive ${APP_NAME} ${label.toLowerCase()}. ` +
    `Confirm your email address and we'll start sending them — nothing goes out until you do.`;

  return {
    to: opts.email,
    subject: `Confirm your ${APP_NAME} newsletter subscription`,
    text: emailText([
      `Hello ${firstName},`,
      '',
      opening,
      '',
      `Confirm your subscription: ${opts.confirmUrl}`,
      '',
      topicDescription(opts.topic),
      '',
      `This link expires in ${opts.expiryDays} days.`,
      '',
      `If you did not ask for this, ignore this email. Your address will not be added and we will not contact you again.`,
    ]),
    html: emailLayout({
      heading: 'Confirm your subscription',
      preheader: `One click and your ${label.toLowerCase()} start arriving.`,
      body: [
        emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
        emailParagraph(escapeHtml(opening)),
        emailButton(opts.confirmUrl, 'Yes, confirm my subscription'),
        emailFallbackLink(opts.confirmUrl),
        emailPanel({
          tone: 'info',
          title: `What you'll get`,
          body: escapeHtml(topicDescription(opts.topic)),
        }),
        emailParagraph(
          `This link expires in ${opts.expiryDays} days. If you did not ask for this, ` +
            `simply ignore this email — your address will not be added to any list ` +
            `and we will not contact you again.`,
        ),
      ].join('\n'),
    }),
  };
}
