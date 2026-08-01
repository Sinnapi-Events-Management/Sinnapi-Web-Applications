// Email content for the promote-intake flow: the message that tells an
// applicant their vendor application was approved and gets them into the Vendor
// Portal. Transport, brand palette, and the shared branded shell live in
// `_shared/emailTemplate.ts`; this module only builds the subject + body so the
// handler stays focused on provisioning.
//
// Two shapes, one template: promotion either CREATES the applicant's account
// (they receive a one-time password, exactly as create-staff does) or reuses a
// profile that already existed for their email (no password is touched, and the
// email must not imply one was set).
import {
  APP_NAME,
  emailButton,
  emailCredential,
  emailDataTable,
  emailFallbackLink,
  emailHeading,
  emailLayout,
  emailList,
  emailPanel,
  emailParagraph,
  emailText,
  escapeHtml,
  type EmailMessage,
} from '../_shared/emailTemplate.ts';

export interface VendorApproved {
  ownerFullName: string;
  ownerEmail: string;
  businessName: string;
  /** Vendor Portal sign-in URL (VENDOR_PORTAL_URL, or the public site). */
  portalUrl: string;
  /**
   * One-time password for an account provisioned by this promotion. `null` when
   * the applicant already had a Sinnapi account — their existing credentials
   * still apply and no password was changed.
   */
  tempPassword: string | null;
}

const NEXT_STEPS = [
  'Complete your vendor profile — photos, service areas and your bio.',
  'Add the services you offer with their pricing, so clients can request quotes.',
  'Publish your listing and start receiving enquiries from clients.',
];

export function vendorApprovedEmail(v: VendorApproved): EmailMessage {
  const firstName = v.ownerFullName.split(/\s+/)[0] || v.ownerFullName;
  const isNewAccount = !!v.tempPassword;

  const credentialRows = [
    { label: 'Business', value: v.businessName },
    { label: 'Sign-in email', value: v.ownerEmail },
    ...(isNewAccount
      ? [
          {
            label: 'Temporary password',
            value: emailCredential(v.tempPassword!),
            raw: true,
          },
        ]
      : []),
  ];

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `Congratulations — your ${APP_NAME} vendor application for "${v.businessName}" has been approved. Your vendor account is live and your trial subscription has started.`,
    '',
    `  Business:      ${v.businessName}`,
    `  Sign-in email: ${v.ownerEmail}`,
    ...(isNewAccount ? [`  Temporary password: ${v.tempPassword}`] : []),
    '',
    `Sign in here: ${v.portalUrl}`,
    '',
    ...(isNewAccount
      ? [
          'SECURITY: this is a one-time password. You will be asked to choose your own the first time you sign in. Never share it with anyone.',
          '',
        ]
      : [
          `You already have a ${APP_NAME} account for this email address — sign in with your existing password. If you have forgotten it, use "Forgot password" on the sign-in page.`,
          '',
        ]),
    'To get started:',
    ...NEXT_STEPS.map((s, i) => `  ${i + 1}. ${s}`),
  ]);

  const html = emailLayout({
    heading: 'Your vendor application has been approved',
    preheader: `${v.businessName} is now live on ${APP_NAME} — here's how to sign in.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `Congratulations — your ${escapeHtml(APP_NAME)} vendor application for ` +
          `<strong>${escapeHtml(v.businessName)}</strong> has been approved. Your vendor account ` +
          `is live and your trial subscription has started.`,
      ),
      emailDataTable(credentialRows),
      emailButton(v.portalUrl, `Sign in to the ${APP_NAME} Vendor Portal`),
      emailFallbackLink(v.portalUrl),
      isNewAccount
        ? emailPanel({
            tone: 'security',
            title: 'For your security',
            body:
              `This is a one-time password. You'll be asked to choose your own the first time you ` +
              `sign in. Never share it with anyone — ${escapeHtml(APP_NAME)} staff will never ` +
              `ask you for it.`,
          })
        : emailPanel({
            tone: 'info',
            body:
              `You already have a ${escapeHtml(APP_NAME)} account for this email address, so your ` +
              `existing password still works — we have not changed it. If you have forgotten it, ` +
              `use <strong>Forgot password</strong> on the sign-in page.`,
          }),
      emailHeading('To get started'),
      emailList(NEXT_STEPS.map(escapeHtml), { ordered: true }),
    ].join('\n'),
  });

  return {
    to: v.ownerEmail,
    subject: `Welcome to ${APP_NAME} — your vendor application was approved`,
    text,
    html,
  };
}
