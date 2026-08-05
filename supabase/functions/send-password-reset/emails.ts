// Email content for an admin-triggered password reset. Transport, brand palette
// and the shared branded shell live in `_shared/emailTemplate.ts`; this module
// only builds the subject + body.
//
// Replaces GoTrue's built-in recovery template, which was the last piece of
// Sinnapi mail that did not look like Sinnapi. Same conventions as the signup
// confirmation: one job, one button, the reason it arrived stated plainly, the
// expiry stated up front, and an explicit "ignore this" line — a reset email
// nobody asked for is the one people are right to be suspicious of, so it says
// what to do about that rather than leaving them guessing.
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

export interface PasswordReset {
  fullName: string;
  email: string;
  /** Recovery link, already pointed at the portal this account belongs to. */
  resetUrl: string;
  /** Human name of that portal, e.g. "Vendor Portal". */
  portalName: string;
  expiryHours: number;
}

export function passwordResetEmail(r: PasswordReset): EmailMessage {
  const firstName = r.fullName.split(/\s+/)[0] || r.fullName;

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `A member of the ${APP_NAME} team has started a password reset for your ${r.portalName} account. Choose a new password using the link below.`,
    '',
    `Reset your password: ${r.resetUrl}`,
    '',
    `This link expires in ${r.expiryHours} hours and can only be used once.`,
    '',
    'Your current password keeps working until you choose a new one, so if you ignore this email nothing changes.',
    '',
    `If you didn't expect this, contact us before using the link.`,
  ]);

  const html = emailLayout({
    heading: 'Reset your password',
    preheader: `Choose a new password for your ${APP_NAME} account.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `A member of the ${escapeHtml(APP_NAME)} team has started a password reset for your ` +
          `<strong>${escapeHtml(r.portalName)}</strong> account. Choose a new password using the ` +
          `button below.`,
      ),
      emailButton(r.resetUrl, 'Choose a new password'),
      emailFallbackLink(r.resetUrl),
      emailPanel({
        tone: 'security',
        title: 'For your security',
        body:
          `This link works once and expires in ${r.expiryHours} hours. Your current password keeps ` +
          `working until you choose a new one — if you ignore this email, nothing changes. ` +
          `If you weren't expecting it, contact us before using the link.`,
      }),
    ].join('\n'),
  });

  return {
    to: r.email,
    subject: `Reset your ${APP_NAME} password`,
    text,
    html,
  };
}
