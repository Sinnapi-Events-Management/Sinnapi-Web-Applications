// Email content for the create-staff flow: the welcome message that delivers a
// new staff member's temporary sign-in password. Transport, brand palette and
// the shared branded shell live in `_shared/email.ts`; this module only builds
// the subject + body so the handler stays focused on provisioning.
import {
  APP_NAME,
  brandColors as c,
  emailLayout,
  emailButton,
  escapeHtml,
  type EmailMessage,
} from '../_shared/email.ts';

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

  const text = [
    `Hello ${firstName},`,
    '',
    `An account has been created for you on the ${APP_NAME} Admin Portal.`,
    '',
    'Your sign-in details:',
    `  Email:    ${w.email}`,
    `  Password: ${w.tempPassword}`,
    `  Role(s):  ${roles}`,
    '',
    `Sign in here: ${w.portalUrl}`,
    '',
    'For your security, this is a temporary password — you will be asked to set your own the first time you sign in. Please do not share it with anyone.',
    '',
    "If you weren't expecting this account, let us know and we'll close it.",
    '',
    'Warm regards,',
    `The ${APP_NAME} Team`,
  ].join('\n');

  const html = emailLayout({
    heading: 'Welcome to the team',
    preheader: `Your ${APP_NAME} Admin Portal account is ready — here's how to sign in.`,
    body: `
      <p style="margin:0 0 16px">Hello <strong>${escapeHtml(firstName)}</strong>,</p>
      <p style="margin:0 0 16px">An account has been created for you on the <strong style="color:${c.primaryMain}">${APP_NAME} Admin Portal</strong>. Use the details below to sign in for the first time.</p>

      <table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid ${c.divider};border-radius:8px;overflow:hidden">
        <tr>
          <td style="padding:12px 16px;background:${c.secondaryLightest};font-weight:600;width:38%;color:${c.textPrimary}">Email</td>
          <td style="padding:12px 16px;background:${c.secondaryLightest};color:${c.textPrimary}">${escapeHtml(w.email)}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-weight:600;color:${c.textPrimary}">Temporary password</td>
          <td style="padding:12px 16px"><code style="background:${c.bgDefault};border:1px solid ${c.divider};color:${c.secondaryDark};padding:4px 12px;border-radius:6px;font-size:15px;letter-spacing:0.5px;font-weight:700">${escapeHtml(w.tempPassword)}</code></td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:${c.secondaryLightest};font-weight:600;color:${c.textPrimary}">Role(s)</td>
          <td style="padding:12px 16px;background:${c.secondaryLightest};color:${c.textPrimary}">${escapeHtml(roles)}</td>
        </tr>
      </table>

      ${emailButton(w.portalUrl, 'Sign in to the Admin Portal')}

      <div style="background:${c.primaryLightest};border:1px solid ${c.primaryLighter};border-radius:8px;padding:16px 18px;margin:22px 0">
        <p style="margin:0;color:${c.primaryDark}"><strong>For your security:</strong> this is a one-time password. You'll be asked to choose your own the first time you sign in. Never share it with anyone.</p>
      </div>

      <p style="margin:0;color:${c.textSecondary};font-size:13px">If you weren't expecting this account, let us know and we'll close it — no action is needed on your part.</p>
    `,
  });

  return {
    to: w.email,
    subject: `Your ${APP_NAME} Admin Portal account is ready`,
    text,
    html,
  };
}
