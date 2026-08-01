// Email content for the reset-staff-password flow: an admin-initiated password
// reset that delivers a fresh one-time password. Composes through the shared
// branded shell in `_shared/emailTemplate.ts`.
import {
  APP_NAME,
  contact,
  emailButton,
  emailCredential,
  emailDataTable,
  emailFallbackLink,
  emailLayout,
  emailPanel,
  emailParagraph,
  emailText,
  escapeHtml,
  type EmailMessage,
} from '../_shared/emailTemplate.ts';

export interface StaffPasswordReset {
  fullName: string;
  email: string;
  tempPassword: string;
  portalUrl: string;
}

export function staffPasswordResetEmail(r: StaffPasswordReset): EmailMessage {
  const firstName = r.fullName.split(/\s+/)[0] || r.fullName;

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `Your password for the ${APP_NAME} Admin Portal has been reset by an administrator. Use the temporary password below to sign in.`,
    '',
    `  Account:                ${r.email}`,
    `  New temporary password: ${r.tempPassword}`,
    '',
    `Sign in here: ${r.portalUrl}`,
    '',
    'SECURITY: you will be asked to choose a new password the next time you sign in, and any previous password no longer works.',
    '',
    `If you didn't request this, contact your administrator right away or email ${contact.supportEmail}.`,
  ]);

  const html = emailLayout({
    heading: 'Your password has been reset',
    preheader: `A new temporary password for your ${APP_NAME} Admin Portal account.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `Your password for the <strong>${escapeHtml(APP_NAME)} Admin Portal</strong> has been reset ` +
          `by an administrator. Use the temporary password below to sign in.`,
      ),
      emailDataTable([
        { label: 'Account', value: r.email },
        { label: 'New temporary password', value: emailCredential(r.tempPassword), raw: true },
      ]),
      emailButton(r.portalUrl, 'Sign in to the Admin Portal'),
      emailFallbackLink(r.portalUrl),
      emailPanel({
        tone: 'security',
        title: 'For your security',
        body: "You'll be asked to choose a new password the next time you sign in, and any previous password no longer works.",
      }),
      emailParagraph(
        `If you didn't request this, contact your administrator right away or email ` +
          `<a href="mailto:${contact.supportEmail}" style="color:#07504D;text-decoration:underline">${contact.supportEmail}</a>.`,
      ),
    ].join('\n'),
  });

  return {
    to: r.email,
    subject: `Your ${APP_NAME} Admin Portal password was reset`,
    text,
    html,
  };
}
