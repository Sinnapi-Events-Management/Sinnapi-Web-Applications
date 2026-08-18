// Email content for the resend-vendor-credentials flow: a fresh one-time
// password for an approved vendor who never got into the portal. Transport,
// palette and the branded shell live in `_shared/emailTemplate.ts`; this module
// only builds the subject + body.
//
// Deliberately NOT a copy of `vendorApprovedEmail`. That message announces a
// decision and reads as a first contact; this one reaches someone who was told
// weeks ago they were approved and has been unable to act on it. Re-sending the
// approval copy would tell them news they already have and say nothing about why
// the password in their inbox stopped working.
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

export interface VendorCredentials {
  fullName: string;
  email: string;
  /** Business name, when the account owns a listing. Null for a stalled promotion. */
  businessName: string | null;
  tempPassword: string;
  /** Vendor Portal sign-in URL (VENDOR_PORTAL_URL, or the public site). */
  portalUrl: string;
}

export function vendorCredentialsEmail(v: VendorCredentials): EmailMessage {
  const firstName = v.fullName.split(/\s+/)[0] || v.fullName;

  const rows = [
    ...(v.businessName ? [{ label: 'Business', value: v.businessName }] : []),
    { label: 'Sign-in email', value: v.email },
    { label: 'Temporary password', value: emailCredential(v.tempPassword), raw: true },
  ];

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `Here are fresh sign-in details for your ${APP_NAME} Vendor Portal account. Use the temporary password below — any password we sent you previously no longer works.`,
    '',
    ...(v.businessName ? [`  Business:           ${v.businessName}`] : []),
    `  Sign-in email:      ${v.email}`,
    `  Temporary password: ${v.tempPassword}`,
    '',
    `Sign in here: ${v.portalUrl}`,
    '',
    'SECURITY: this is a one-time password. You will be asked to choose your own the first time you sign in. Never share it with anyone.',
    '',
    `If you weren't expecting this, contact us at ${contact.supportEmail}.`,
  ]);

  const html = emailLayout({
    heading: 'Your vendor sign-in details',
    preheader: `A new temporary password for your ${APP_NAME} Vendor Portal account.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `Here are fresh sign-in details for your <strong>${escapeHtml(APP_NAME)} Vendor Portal</strong> ` +
          `account. Use the temporary password below — any password we sent you previously no longer works.`,
      ),
      emailDataTable(rows),
      emailButton(v.portalUrl, `Sign in to the ${APP_NAME} Vendor Portal`),
      emailFallbackLink(v.portalUrl),
      emailPanel({
        tone: 'security',
        title: 'For your security',
        body:
          `This is a one-time password. You'll be asked to choose your own the first time you ` +
          `sign in. Never share it with anyone — ${escapeHtml(APP_NAME)} staff will never ask you for it.`,
      }),
      emailParagraph(
        `If you weren't expecting this, contact us at ` +
          `<a href="mailto:${contact.supportEmail}" style="color:#07504D;text-decoration:underline">${contact.supportEmail}</a>.`,
      ),
    ].join('\n'),
  });

  return {
    to: v.email,
    subject: `Your ${APP_NAME} Vendor Portal sign-in details`,
    text,
    html,
  };
}
