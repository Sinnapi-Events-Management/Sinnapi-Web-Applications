// Email content for the intake triage flow (`set-intake-status`). Transport,
// brand palette, and the shared branded shell live in `_shared/emailTemplate.ts`;
// this module only builds per-status subjects + bodies so the handler stays
// focused on authorization and the state transition.
//
// One builder per applicant-visible status. `approved` is deliberately absent:
// approval runs through the `promote-intake` Edge Function, which provisions the
// applicant's account and owns that email (see `promote-intake/emails.ts`).
import {
  APP_NAME,
  PUBLIC_SITE_URL,
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
  contact,
  type EmailMessage,
} from '../_shared/emailTemplate.ts';

/** Statuses this module can write copy for. */
export type IntakeEmailStatus = 'submitted' | 'reviewing' | 'rejected';

export interface IntakeStatusSummary {
  ownerFullName: string;
  ownerEmail: string;
  businessName: string;
  submissionRef: string;
  /**
   * Applicant-facing rejection reason (the `review_notes` captured by the admin
   * portal's reject dialog). Only read for `rejected`.
   */
  reason?: string | null;
}

/** Public "Become a vendor" form — the re-apply CTA target. */
const APPLY_URL = `${PUBLIC_SITE_URL.replace(/\/$/, '')}/apply`;

const firstNameOf = (fullName: string) => fullName.split(/\s+/)[0] || fullName;

/** Escape a multi-line, admin-authored string for an HTML email body. */
function escapeMultiline(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, '<br/>');
}

/** Reference/business rows every intake email carries, for support lookups. */
function identityRows(a: IntakeStatusSummary) {
  return [
    { label: 'Business', value: a.businessName },
    { label: 'Reference', value: emailCredential(a.submissionRef), raw: true },
  ];
}

// ── reviewing: picked up out of the queue ─────────────────────────────────
const REVIEWING_STEPS = [
  'We verify your business details and the documents you uploaded.',
  'We may contact you on the phone number or email you applied with if anything needs clarifying.',
  "You'll hear from us by email as soon as a decision has been made.",
];

function reviewingEmail(a: IntakeStatusSummary): EmailMessage {
  const firstName = firstNameOf(a.ownerFullName);

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `Good news — your ${APP_NAME} vendor application for "${a.businessName}" has been picked up by our team and is now under active review.`,
    '',
    `Reference: ${a.submissionRef}`,
    '',
    'What we are doing now:',
    ...REVIEWING_STEPS.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    "There's nothing for you to do right now — please keep an eye on your inbox.",
  ]);

  const html = emailLayout({
    heading: 'Your application is under review',
    preheader: `Our team has started reviewing your ${APP_NAME} vendor application.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `Good news — your ${escapeHtml(APP_NAME)} vendor application for ` +
          `<strong>${escapeHtml(a.businessName)}</strong> has been picked up by our team ` +
          `and is now under active review.`,
      ),
      emailDataTable(identityRows(a)),
      emailHeading('What we are doing now'),
      emailList(REVIEWING_STEPS.map(escapeHtml), { ordered: true }),
      emailPanel({
        tone: 'info',
        body: "There's nothing for you to do right now — please keep an eye on your inbox, including your spam folder, so you don't miss our decision.",
      }),
    ].join('\n'),
  });

  return {
    to: a.ownerEmail,
    subject: `Your ${APP_NAME} vendor application is under review`,
    text,
    html,
  };
}

// ── rejected: declined, with the reviewer's reason ────────────────────────
const REAPPLY_STEPS = [
  'Read the reason above carefully and address each point.',
  'Gather any documents or details that were missing or unclear.',
  'Submit a fresh application — it goes straight back into our review queue.',
];

function rejectedEmail(a: IntakeStatusSummary): EmailMessage {
  const firstName = firstNameOf(a.ownerFullName);
  const reason = (a.reason ?? '').trim();

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `Thank you for the time you put into your ${APP_NAME} vendor application for "${a.businessName}". After reviewing it, we are unable to approve it at this time.`,
    '',
    ...(reason ? ['Reason for the decision:', reason, ''] : []),
    `Reference: ${a.submissionRef}`,
    '',
    'This is not the end of the road — you are welcome to apply again:',
    ...REAPPLY_STEPS.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    `Apply again: ${APPLY_URL}`,
    '',
    'If anything in this decision is unclear, reply to this email or contact our support team and we will be glad to explain.',
  ]);

  const html = emailLayout({
    heading: 'An update on your vendor application',
    preheader: `A decision has been made on your ${APP_NAME} vendor application for ${a.businessName}.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `Thank you for the time you put into your ${escapeHtml(APP_NAME)} vendor application for ` +
          `<strong>${escapeHtml(a.businessName)}</strong>. After reviewing it, we are unable to ` +
          `approve it at this time.`,
      ),
      reason
        ? emailPanel({
            tone: 'security',
            title: 'Reason for the decision',
            body: escapeMultiline(reason),
          })
        : '',
      emailDataTable(identityRows(a)),
      emailHeading('You can apply again'),
      emailList(REAPPLY_STEPS.map(escapeHtml), { ordered: true }),
      emailButton(APPLY_URL, 'Start a new application'),
      emailFallbackLink(APPLY_URL),
      emailParagraph(
        'If anything in this decision is unclear, reply to this email or contact our support ' +
          'team and we will be glad to explain.',
      ),
    ].join('\n'),
  });

  return {
    to: a.ownerEmail,
    subject: `An update on your ${APP_NAME} vendor application`,
    text,
    html,
    // The copy invites a reply, so point it at a monitored inbox rather than the
    // no-reply SMTP sender the transport defaults to.
    replyTo: contact.supportEmail,
  };
}

// ── submitted: moved back into the general queue ──────────────────────────
function submittedEmail(a: IntakeStatusSummary): EmailMessage {
  const firstName = firstNameOf(a.ownerFullName);

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `Your ${APP_NAME} vendor application for "${a.businessName}" has been returned to our review queue so the team can take another look at it. No decision has been made yet.`,
    '',
    `Reference: ${a.submissionRef}`,
    '',
    "Your application is still active and nothing you submitted has been lost. There's no action needed from you — we'll email you as soon as there's an update.",
  ]);

  const html = emailLayout({
    heading: 'Your application is back in our review queue',
    preheader: `Your ${APP_NAME} vendor application is still active — no decision has been made yet.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `Your ${escapeHtml(APP_NAME)} vendor application for ` +
          `<strong>${escapeHtml(a.businessName)}</strong> has been returned to our review queue ` +
          `so the team can take another look at it. No decision has been made yet.`,
      ),
      emailDataTable(identityRows(a)),
      emailPanel({
        tone: 'info',
        body: "Your application is still active and nothing you submitted has been lost. There's no action needed from you — we'll email you as soon as there's an update.",
      }),
    ].join('\n'),
  });

  return {
    to: a.ownerEmail,
    subject: `Your ${APP_NAME} vendor application is back in the review queue`,
    text,
    html,
  };
}

const BUILDERS: Record<IntakeEmailStatus, (a: IntakeStatusSummary) => EmailMessage> = {
  submitted: submittedEmail,
  reviewing: reviewingEmail,
  rejected: rejectedEmail,
};

/**
 * Build the applicant-facing email for an intake status transition. Returns
 * `null` for a status with no applicant-visible copy, so the caller can skip
 * the send rather than guess at wording.
 */
export function intakeStatusEmail(status: string, a: IntakeStatusSummary): EmailMessage | null {
  const build = BUILDERS[status as IntakeEmailStatus];
  return build ? build(a) : null;
}
