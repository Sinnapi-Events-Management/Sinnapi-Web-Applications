// Email content for the reset-staff-password flow: an admin-initiated password
// reset that delivers a fresh one-time password. Composes through the shared
// branded shell in `_shared/email.ts`.
import {
  APP_NAME,
  brandColors as c,
  emailLayout,
  emailButton,
  escapeHtml,
  type EmailMessage,
} from '../_shared/email.ts';

export interface StaffPasswordReset {
  fullName: string;
  email: string;
  tempPassword: string;
  portalUrl: string;
}

export function staffPasswordResetEmail(r: StaffPasswordReset): EmailMessage {
  const firstName = r.fullName.split(/\s+/)[0] || r.fullName;

  const text = [
    `Hello ${firstName},`,
    '',
    `Your password for the ${APP_NAME} Admin Portal has been reset by an administrator.`,
    '',
    'Your new temporary password:',
    `  ${r.tempPassword}`,
    '',
    `Sign in here: ${r.portalUrl}`,
    '',
    'For your security, you will be asked to set your own password the next time you sign in. Any previous password no longer works.',
    '',
    "If you didn't request this, contact your administrator right away.",
    '',
    'Warm regards,',
    `The ${APP_NAME} Team`,
  ].join('\n');

  const html = emailLayout({
    heading: 'Your password was reset',
    preheader: `A new temporary password for your ${APP_NAME} Admin Portal account.`,
    body: `
      <p style="margin:0 0 16px">Hello <strong>${escapeHtml(firstName)}</strong>,</p>
      <p style="margin:0 0 16px">Your password for the <strong style="color:${c.primaryMain}">${APP_NAME} Admin Portal</strong> has been reset by an administrator. Use the temporary password below to sign in.</p>

      <table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid ${c.divider};border-radius:8px;overflow:hidden">
        <tr>
          <td style="padding:12px 16px;background:${c.secondaryLightest};font-weight:600;width:42%;color:${c.textPrimary}">New temporary password</td>
          <td style="padding:12px 16px;background:${c.secondaryLightest}"><code style="background:${c.white};border:1px solid ${c.divider};color:${c.secondaryDark};padding:4px 12px;border-radius:6px;font-size:15px;letter-spacing:0.5px;font-weight:700">${escapeHtml(r.tempPassword)}</code></td>
        </tr>
      </table>

      ${emailButton(r.portalUrl, 'Sign in to the Admin Portal')}

      <div style="background:${c.primaryLightest};border:1px solid ${c.primaryLighter};border-radius:8px;padding:16px 18px;margin:22px 0">
        <p style="margin:0;color:${c.primaryDark}"><strong>For your security:</strong> you'll be asked to choose a new password the next time you sign in, and any previous password no longer works.</p>
      </div>

      <p style="margin:0;color:${c.textSecondary};font-size:13px">If you didn't request this, contact your administrator right away.</p>
    `,
  });

  return {
    to: r.email,
    subject: `Your ${APP_NAME} Admin Portal password was reset`,
    text,
    html,
  };
}
