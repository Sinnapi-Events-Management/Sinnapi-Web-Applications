// Email content for the vendor-application flow. Transport, brand palette, and
// the shared branded shell live in `_shared/emailTemplate.ts`; this module only builds
// per-flow subjects + bodies so the handler stays focused on validation.
import {
  APP_NAME,
  PUBLIC_SITE_URL,
  emailButton,
  emailCredential,
  emailDataTable,
  emailHeading,
  emailLayout,
  emailList,
  emailPanel,
  emailParagraph,
  emailText,
  escapeHtml,
  type EmailMessage,
} from '../_shared/emailTemplate.ts';

export interface ApplicantSummary {
  ownerFullName: string;
  ownerEmail: string;
  businessName: string;
  submissionRef: string;
}

const NEXT_STEPS = [
  'Our team reviews your application and verifies your business details.',
  'We may reach out if we need anything else from you.',
  "Once approved, you'll receive your Business Portal login so you can start listing your services.",
];

// ── Applicant confirmation ────────────────────────────────────────────────
export function applicantConfirmationEmail(a: ApplicantSummary): EmailMessage {
  const firstName = a.ownerFullName.split(/\s+/)[0] || a.ownerFullName;

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `Thank you for applying to become a vendor on ${APP_NAME}. We've received your application for "${a.businessName}" and it is now in our review queue.`,
    '',
    `Reference: ${a.submissionRef}`,
    '',
    'What happens next:',
    ...NEXT_STEPS.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    "No action is needed from you right now — we'll email you as soon as there's an update.",
    '',
    `Learn more: ${PUBLIC_SITE_URL}`,
  ]);

  const html = emailLayout({
    heading: 'Your application has been received',
    preheader: `We've received your ${APP_NAME} vendor application for ${a.businessName}.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `Thank you for applying to become a vendor on ${escapeHtml(APP_NAME)}. ` +
          `We've received your application for <strong>${escapeHtml(a.businessName)}</strong> ` +
          `and it is now in our review queue.`,
      ),
      emailDataTable([
        { label: 'Business', value: a.businessName },
        { label: 'Reference', value: emailCredential(a.submissionRef), raw: true },
      ]),
      emailHeading('What happens next'),
      emailList(NEXT_STEPS.map(escapeHtml), { ordered: true }),
      emailPanel({
        tone: 'info',
        body: "No action is needed from you right now — we'll email you as soon as there's an update on your application.",
      }),
      emailButton(PUBLIC_SITE_URL, `Explore selling on ${APP_NAME}`),
    ].join('\n'),
  });

  return {
    to: a.ownerEmail,
    subject: `We've received your ${APP_NAME} vendor application`,
    text,
    html,
  };
}

// ── Internal team notification ────────────────────────────────────────────
export function internalNotificationEmail(to: string, a: ApplicantSummary): EmailMessage {
  const rows = [
    { label: 'Business', value: a.businessName },
    { label: 'Applicant', value: a.ownerFullName },
    { label: 'Email', value: a.ownerEmail },
    { label: 'Reference', value: a.submissionRef },
  ];

  const text = emailText([
    `A new vendor application has been submitted on ${APP_NAME} and is awaiting review.`,
    '',
    ...rows.map((r) => `  ${r.label}: ${r.value}`),
    '',
    'Review it in the admin portal. Replying to this email goes straight to the applicant.',
  ]);

  const html = emailLayout({
    heading: 'New vendor application',
    preheader: `${a.businessName} just applied to become a vendor.`,
    body: [
      emailParagraph('A new vendor application has been submitted and is awaiting review.'),
      emailDataTable(rows),
      emailParagraph(
        `Review it in the admin portal. Replying to this email goes straight to the applicant.`,
      ),
    ].join('\n'),
  });

  return {
    to,
    subject: `New vendor application: ${a.businessName}`,
    text,
    html,
    // Let the team reply straight to the applicant.
    replyTo: a.ownerEmail,
  };
}
