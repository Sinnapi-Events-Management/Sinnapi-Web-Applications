// Email content for the client self-registration flow: the address-confirmation
// message that activates a new client account. Transport, brand palette and the
// shared branded shell live in `_shared/emailTemplate.ts`; this module only
// builds the subject + body so the handler stays focused on provisioning.
//
// Written to the verification-email conventions this kind of mail is judged by:
// one job, one button, no navigation or marketing competing with it, the reason
// the message arrived stated plainly, and an explicit "ignore this" line so a
// recipient who did not sign up is told to do nothing rather than left to
// wonder. The expiry is spelled out because a link that dies silently generates
// more support mail than any other part of the flow.
import {
  APP_NAME,
  emailButton,
  emailFallbackLink,
  emailLayout,
  emailPanel,
  emailParagraph,
  emailText,
  escapeHtml,
  type EmailMessage,
} from '../_shared/emailTemplate.ts';

export interface ConfirmSignup {
  fullName: string;
  email: string;
  /** The GoTrue confirmation link, already pointed at the client portal. */
  confirmUrl: string;
  /** Link lifetime in hours, quoted in the copy so the two cannot drift. */
  expiryHours: number;
  /** True when this is a resend, which changes only the framing. */
  resend?: boolean;
}

export function confirmSignupEmail(c: ConfirmSignup): EmailMessage {
  const firstName = c.fullName.split(/\s+/)[0] || c.fullName;
  const opening = c.resend
    ? `Here's a fresh link to confirm your email address and finish setting up your ${APP_NAME} account. Any earlier link you were sent no longer works.`
    : `Thanks for signing up. Confirm your email address to activate your ${APP_NAME} account and start planning.`;

  const text = emailText([
    `Hello ${firstName},`,
    '',
    opening,
    '',
    `Confirm your email: ${c.confirmUrl}`,
    '',
    `This link expires in ${c.expiryHours} hours and can only be used once. If it expires you can request a new one from the sign-in page.`,
    '',
    `If you didn't create a ${APP_NAME} account, you can ignore this email — nothing was activated and no further messages will be sent.`,
  ]);

  const html = emailLayout({
    heading: c.resend ? 'Your new confirmation link' : 'Confirm your email address',
    preheader: `One click activates your ${APP_NAME} account.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(escapeHtml(opening)),
      emailButton(c.confirmUrl, 'Confirm my email address'),
      emailFallbackLink(c.confirmUrl),
      emailPanel({
        tone: 'info',
        title: 'This link expires',
        body:
          `For your security it works once and only for the next ${c.expiryHours} hours. ` +
          `If it expires, request a new one from the sign-in page — it takes a moment.`,
      }),
      emailParagraph(
        `If you didn't create a ${escapeHtml(APP_NAME)} account, you can safely ignore this email. ` +
          `Nothing has been activated and we won't email you again.`,
      ),
    ].join('\n'),
  });

  return {
    to: c.email,
    subject: c.resend
      ? `Your new ${APP_NAME} confirmation link`
      : `Confirm your email to activate your ${APP_NAME} account`,
    text,
    html,
  };
}
