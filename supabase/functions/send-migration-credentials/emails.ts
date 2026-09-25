// Email content for the 2026-09 legacy migration: the message that tells a
// client or a vendor their Sinnapi account has moved to the new platform, and
// hands them the one-time password provisioned by the import.
//
// Transport, brand palette and the branded shell live in
// `_shared/emailTemplate.ts`; this module only builds the subject and body, the
// same division `promote-intake/emails.ts` uses.
//
// ── TWO AUDIENCES, TWO MESSAGES ────────────────────────────────────────────
// A client and a vendor are being invited to different places to do different
// things, so they get different emails rather than one hedged message that
// serves neither:
//
//   client  signs in to the Client Portal to plan events and request quotes.
//   vendor  signs in to the Vendor Portal, where a listing is already waiting
//           and an onboarding wizard needs finishing before it is complete.
//
// ── WHAT THE VENDOR MESSAGE MUST NOT DO ────────────────────────────────────
// It must not imply the listing is finished. The import carried across the
// business name, location, categories and subscription tier and nothing else —
// no biography, pricing, lead time, photos, payout details or service areas,
// because the source data had none. Telling a vendor their profile is live
// without saying it is incomplete would be a pleasant sentence that produces a
// disappointed vendor a week later when no enquiries arrive.
//
// ── THE CREDENTIAL ─────────────────────────────────────────────────────────
// Every account carries `must_change_password: true`, so the password below is
// genuinely single-use: the portal forces a replacement on first sign-in. The
// security panel says so plainly, and says that Sinnapi staff will never ask
// for it — the sentence that makes the message harder to imitate.
import {
  APP_NAME,
  contact,
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

/** Support details repeated in every message, per the migration brief. */
export const SUPPORT_EMAIL = contact.supportEmail;
export const SUPPORT_PHONE = contact.supportPhone;

export interface MigrationCredential {
  /** Display name from the imported profile. */
  fullName: string;
  /** Sign-in address — also the recipient. */
  email: string;
  /** One-time password provisioned by 03_import.sql. */
  tempPassword: string;
  /** Portal sign-in URL for this audience. */
  portalUrl: string;
  /** Vendors only: the business name carried over from the old platform. */
  businessName?: string | null;
}

const CLIENT_STEPS = [
  'Sign in and choose a new password — the one below only works once.',
  'Check your details are right, and add a phone number if we do not have one.',
  'Browse vendors, request quotations and plan your event.',
];

const VENDOR_STEPS = [
  'Sign in and choose a new password — the one below only works once.',
  'Finish your profile: your bio, photos, service areas and payout details. We brought across your business name, location and categories, but the rest was not on the old platform.',
  'Add your services and packages with pricing, so clients can request quotes.',
  'Publish your listing and start receiving enquiries.',
];

/**
 * The support block, identical in both messages. Rendered as a panel rather
 * than a trailing sentence because it is the thing somebody scrolls back to
 * look for when a password does not work.
 */
function supportPanelHtml(): string {
  return emailPanel({
    tone: 'info',
    title: 'If anything does not work',
    body:
      `Email <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:inherit;">` +
      `${escapeHtml(SUPPORT_EMAIL)}</a> or call ` +
      `<a href="tel:${escapeHtml(SUPPORT_PHONE.replace(/\s+/g, ''))}" style="color:inherit;">` +
      `${escapeHtml(SUPPORT_PHONE)}</a> and we will sort it out.`,
  });
}

function supportTextLines(): string[] {
  return ['If anything does not work:', `  Email: ${SUPPORT_EMAIL}`, `  Phone: ${SUPPORT_PHONE}`];
}

/** Security wording shared by both audiences. */
function securityPanelHtml(): string {
  return emailPanel({
    tone: 'security',
    title: 'For your security',
    body:
      `This is a one-time password. You will be asked to choose your own the first time you ` +
      `sign in. Never share it with anyone — ${escapeHtml(APP_NAME)} staff will never ask ` +
      `you for it.`,
  });
}

const SECURITY_TEXT =
  'SECURITY: this is a one-time password. You will be asked to choose your own the first ' +
  `time you sign in. Never share it with anyone — ${APP_NAME} staff will never ask you for it.`;

// ───────────────────────────────────────────────────────────────────────────
// Client
// ───────────────────────────────────────────────────────────────────────────

export function clientMigrationEmail(v: MigrationCredential): EmailMessage {
  const firstName = v.fullName.split(/\s+/)[0] || v.fullName;

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `${APP_NAME} has moved to a new platform, and your account has moved with it. Everything ` +
      `is ready for you — you just need a new password to get in.`,
    '',
    `  Sign-in email:      ${v.email}`,
    `  Temporary password: ${v.tempPassword}`,
    '',
    `Sign in here: ${v.portalUrl}`,
    '',
    SECURITY_TEXT,
    '',
    'What to do next:',
    ...CLIENT_STEPS.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    ...supportTextLines(),
  ]);

  const html = emailLayout({
    heading: `${APP_NAME} has a new home`,
    preheader: `Your ${APP_NAME} account has moved — here is how to sign in.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `${escapeHtml(APP_NAME)} has moved to a new platform, and your account has moved with ` +
          `it. Everything is ready for you — you just need a new password to get in.`,
      ),
      emailDataTable([
        { label: 'Sign-in email', value: v.email },
        { label: 'Temporary password', value: emailCredential(v.tempPassword), raw: true },
      ]),
      emailButton(v.portalUrl, `Sign in to ${APP_NAME}`),
      emailFallbackLink(v.portalUrl),
      securityPanelHtml(),
      emailHeading('What to do next'),
      emailList(CLIENT_STEPS.map(escapeHtml), { ordered: true }),
      supportPanelHtml(),
    ].join('\n'),
  });

  return {
    to: v.email,
    subject: `Your ${APP_NAME} account has moved — here is how to sign in`,
    text,
    html,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Vendor
// ───────────────────────────────────────────────────────────────────────────

export function vendorMigrationEmail(v: MigrationCredential): EmailMessage {
  const firstName = v.fullName.split(/\s+/)[0] || v.fullName;
  const business = v.businessName?.trim() || 'your business';

  const text = emailText([
    `Hello ${firstName},`,
    '',
    `${APP_NAME} has moved to a new platform, and "${business}" has moved with it. Your ` +
      `listing is already there and your 30-day trial has started — you just need a new ` +
      `password to get in.`,
    '',
    `  Business:           ${business}`,
    `  Sign-in email:      ${v.email}`,
    `  Temporary password: ${v.tempPassword}`,
    '',
    `Sign in here: ${v.portalUrl}`,
    '',
    SECURITY_TEXT,
    '',
    `Your listing is not finished yet. We brought across your business name, location and ` +
      `service categories, but the old platform did not hold your bio, pricing, photos, ` +
      `service areas or payout details. The portal will walk you through adding them.`,
    '',
    'What to do next:',
    ...VENDOR_STEPS.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    ...supportTextLines(),
  ]);

  const html = emailLayout({
    heading: `${APP_NAME} has a new home — and so does ${business}`,
    preheader: `Your ${APP_NAME} vendor listing has moved — here is how to sign in.`,
    body: [
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(
        `${escapeHtml(APP_NAME)} has moved to a new platform, and ` +
          `<strong>${escapeHtml(business)}</strong> has moved with it. Your listing is already ` +
          `there and your 30-day trial has started — you just need a new password to get in.`,
      ),
      emailDataTable([
        { label: 'Business', value: business },
        { label: 'Sign-in email', value: v.email },
        { label: 'Temporary password', value: emailCredential(v.tempPassword), raw: true },
      ]),
      emailButton(v.portalUrl, `Sign in to the ${APP_NAME} Vendor Portal`),
      emailFallbackLink(v.portalUrl),
      securityPanelHtml(),
      // Said plainly, and said before the steps rather than buried under them.
      // A vendor who believes the listing is complete will not open the wizard.
      emailPanel({
        tone: 'info',
        title: 'Your listing is not finished yet',
        body:
          `We brought across your business name, location and service categories — but the old ` +
          `platform did not hold your bio, pricing, photos, service areas or payout details. ` +
          `The portal will walk you through adding them when you sign in.`,
      }),
      emailHeading('What to do next'),
      emailList(VENDOR_STEPS.map(escapeHtml), { ordered: true }),
      supportPanelHtml(),
    ].join('\n'),
  });

  return {
    to: v.email,
    subject: `${business} has moved to the new ${APP_NAME} — here is how to sign in`,
    text,
    html,
  };
}
