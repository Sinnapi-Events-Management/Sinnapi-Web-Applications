// Email content for the vendor-application flow. Transport, brand palette, and
// the shared branded shell live in `_shared/email.ts`; this module only builds
// per-flow subjects + bodies so the handler stays focused on validation.
import {
  APP_NAME,
  PUBLIC_SITE_URL,
  brandColors as c,
  emailFonts,
  emailLayout,
  emailButton,
  escapeHtml,
  type EmailMessage,
} from '../_shared/email.ts';

export interface ApplicantSummary {
  ownerFullName: string;
  ownerEmail: string;
  businessName: string;
  submissionRef: string;
}

// ── Applicant confirmation ────────────────────────────────────────────────
export function applicantConfirmationEmail(a: ApplicantSummary): EmailMessage {
  const firstName = a.ownerFullName.split(/\s+/)[0] || a.ownerFullName;
  const business = escapeHtml(a.businessName);
  const ref = escapeHtml(a.submissionRef);

  const text = [
    `Hello ${firstName},`,
    '',
    `Thank you for applying to become a vendor on ${APP_NAME}. We've received your application for "${a.businessName}" and it is now in our review queue.`,
    '',
    `Reference: ${a.submissionRef}`,
    '',
    'What happens next:',
    '  1. Our team reviews your application and verifies your details.',
    '  2. We may reach out if we need anything else.',
    "  3. Once approved, you'll receive your Business Portal login so you can start listing your services.",
    '',
    'No action is needed from you right now.',
    '',
    `Learn more: ${PUBLIC_SITE_URL}`,
    '',
    'Warm regards,',
    `The ${APP_NAME} Team`,
  ].join('\n');

  const html = emailLayout({
    heading: 'Application Received',
    preheader: `We've received your ${APP_NAME} vendor application for ${a.businessName}.`,
    body: `
      <p style="margin:0 0 16px">Hello <strong>${escapeHtml(firstName)}</strong>,</p>
      <p style="margin:0 0 16px">Thank you for applying to become a vendor on <strong style="color:${c.primaryMain}">${APP_NAME}</strong>. We've received your application for <strong>${business}</strong> and it's now in our review queue.</p>

      <table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid ${c.divider};border-radius:8px;overflow:hidden">
        <tr>
          <td style="padding:12px 16px;background:${c.secondaryLightest};font-weight:600;width:40%;color:${c.textPrimary}">Reference</td>
          <td style="padding:12px 16px;background:${c.secondaryLightest}"><code style="background:${c.white};border:1px solid ${c.divider};color:${c.secondaryDark};padding:3px 10px;border-radius:6px;font-size:13px">${ref}</code></td>
        </tr>
      </table>

      <p style="font-weight:600;margin:24px 0 10px;font-family:${emailFonts.heading};font-size:17px;color:${c.primaryMain}">What happens next</p>
      <ol style="margin:0 0 8px 20px;padding:0;color:${c.textPrimary}">
        <li style="margin-bottom:8px">Our team reviews your application and verifies your details.</li>
        <li style="margin-bottom:8px">We may reach out if we need anything else.</li>
        <li>Once approved, you'll receive your Business Portal login so you can start listing your services.</li>
      </ol>

      <div style="background:${c.primaryLightest};border:1px solid ${c.primaryLighter};border-radius:8px;padding:16px 18px;margin:22px 0">
        <p style="margin:0;color:${c.primaryDark}">No action is needed from you right now — we'll email you as soon as there's an update.</p>
      </div>

      ${emailButton(PUBLIC_SITE_URL, `Explore selling on ${APP_NAME}`)}
    `,
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
  const rows: [string, string][] = [
    ['Business', a.businessName],
    ['Applicant', a.ownerFullName],
    ['Email', a.ownerEmail],
    ['Reference', a.submissionRef],
  ];

  const text = [
    `A new vendor application has been submitted on ${APP_NAME}.`,
    '',
    ...rows.map(([k, v]) => `  ${k}: ${v}`),
    '',
    'Review it in the admin portal.',
  ].join('\n');

  const html = emailLayout({
    heading: 'New Vendor Application',
    preheader: `${a.businessName} just applied to become a vendor.`,
    body: `
      <p style="margin:0 0 16px">A new vendor application has been submitted and is awaiting review.</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid ${c.divider};border-radius:8px;overflow:hidden">
        ${rows
          .map(([k, v], i) => {
            const bg = i % 2 === 0 ? c.bgDefault : c.white;
            return `<tr>
              <td style="padding:12px 16px;background:${bg};font-weight:600;width:35%;color:${c.primaryMain}">${escapeHtml(k)}</td>
              <td style="padding:12px 16px;background:${bg};color:${c.textPrimary}">${escapeHtml(v)}</td>
            </tr>`;
          })
          .join('')}
      </table>
      <p style="margin:0;color:${c.textSecondary}">Review it in the admin portal.</p>
    `,
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
