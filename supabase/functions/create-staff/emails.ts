// Email content for the create-staff flow: the welcome message that delivers a
// new staff member's temporary sign-in password. Transport, brand palette and
// the shared branded shell live in `_shared/emailTemplate.ts`; this module only builds
// the subject + body so the handler stays focused on provisioning.
import {
  APP_NAME,
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

export interface StaffWelcome {
  fullName: string;
  email: string;
  tempPassword: string;
  portalUrl: string;
  /** Human role names for the "you've been granted" line, e.g. ["Finance"]. */
  roleNames: string[];
}

export function staffWelcomeEmail(w: StaffWelcome): EmailMessage {
  const firstName = w.fullName.split(/\s+/)[0] || w.fullName;
  const roles = w.roleNames.length ? w.roleNames.join(', ') : 'Staff';

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `An account has been created for you on the ${APP_NAME} Admin Portal. Use the details below to sign in for the first time.`,
    '',
    `  Email:              ${w.email}`,
    `  Temporary password: ${w.tempPassword}`,
    `  Role(s):            ${roles}`,
    '',
    `Sign in here: ${w.portalUrl}`,
    '',
    'SECURITY: this is a one-time password. You will be asked to choose your own the first time you sign in. Never share it with anyone.',
    '',
    "If you weren't expecting this account, let us know and we'll close it — no action is needed on your part.",
  ]);

  const html = emailLayout({
    heading: 'Welcome to the team',
    preheader: `Your ${APP_NAME} Admin Portal account is ready — here's how to sign in.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `An account has been created for you on the <strong>${escapeHtml(APP_NAME)} Admin Portal</strong>. ` +
          `Use the details below to sign in for the first time.`,
      ),
      emailDataTable([
        { label: 'Email', value: w.email },
        { label: 'Temporary password', value: emailCredential(w.tempPassword), raw: true },
        { label: 'Role(s)', value: roles },
      ]),
      emailButton(w.portalUrl, 'Sign in to the Admin Portal'),
      emailFallbackLink(w.portalUrl),
      emailPanel({
        tone: 'security',
        title: 'For your security',
        body:
          `This is a one-time password. You'll be asked to choose your own the first time you sign in. ` +
          `Never share it with anyone — ${escapeHtml(APP_NAME)} staff will never ask you for it.`,
      }),
      emailParagraph(
        `If you weren't expecting this account, let us know and we'll close it — no action is needed on your part.`,
      ),
    ].join('\n'),
  });

  return {
    to: w.email,
    subject: `Your ${APP_NAME} Admin Portal account is ready`,
    text,
    html,
  };
}
