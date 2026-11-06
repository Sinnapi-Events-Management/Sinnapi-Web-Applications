// Email content for send-financial-document: an invoice or a receipt sent
// by a vendor to their client, with the PDF attached. Transport and the
// branded shell live in `_shared/`; this builds only the subject and body.
//
// The email is from the VENDOR's point of view — their business name leads
// the subject and the heading — but it travels through Sinnapi's account,
// so the shell (and its footer) stays Sinnapi's.
//
// How the recipient replies depends on who they are:
//   registered client  → a link to Sinnapi messages; the vendor's email stays private
//   external client    → Reply-To is the vendor, set by the caller
import {
  APP_NAME,
  emailButton,
  emailDataTable,
  emailFallbackLink,
  emailLayout,
  emailPanel,
  emailParagraph,
  emailText,
  escapeHtml,
  escapeUrl,
  type EmailMessage,
} from '../_shared/emailTemplate.ts';

export type DocumentEmailInput = {
  kind: 'invoice' | 'receipt';
  businessName: string;
  recipientName: string;
  documentNo: string;
  /** Pre-formatted, e.g. "UGX 1,500,000". Amount due for an invoice, amount received for a receipt. */
  amount: string;
  /**
   * Invoices only: set once nothing is owed — "Paid in full" or "Overpaid by"
   * (1106b) — so the email never asks for a zero or negative amount.
   */
  settled: { label: string; value: string } | null;
  /** Pre-formatted. Due date for an invoice, payment date for a receipt. */
  date: string;
  /** Receipts linked to an invoice, or with a typed balance: what is still owed, or the overpayment. */
  balance: { label: string; value: string } | null;
  /** The invoice's "For" line, or the receipt's description. */
  title: string | null;
  vendorMessage: string | null;
  /** Registered clients only: where to open the document and reply in Sinnapi. */
  portal: { documentUrl: string; messagesUrl: string } | null;
  /** Booking invoices: paid through Sinnapi checkout, linked here. */
  payThroughSinnapiUrl: string | null;
  /** True when this is the vendor's own copy. */
  isVendorCopy: boolean;
  /** True when the vendor sent it ONLY to themselves (no client received anything). */
  isSelfSend?: boolean;
};

export function documentEmail(d: DocumentEmailInput): Omit<EmailMessage, 'to'> {
  const isInvoice = d.kind === 'invoice';
  const noun = isInvoice ? 'Invoice' : 'Receipt';
  const invoiceTail = d.settled
    ? d.settled.label === 'Paid in full'
      ? 'paid in full'
      : `${d.settled.label.toLowerCase()} ${d.settled.value}`
    : `${d.amount} due ${d.date}`;
  const subjectCore = isInvoice
    ? `Invoice ${d.documentNo} from ${d.businessName} — ${invoiceTail}`
    : `Receipt ${d.documentNo} from ${d.businessName} — ${d.amount} received`;
  // No line breaks in a header, whatever a business name contains.
  const subjectLine = subjectCore.replace(/[\r\n]+/g, ' ');
  const subject = d.isVendorCopy ? `Copy: ${subjectLine}` : subjectLine;

  const firstName = d.recipientName.split(/\s+/)[0] || d.recipientName;
  const lead = isInvoice
    ? `${d.businessName} has sent you an invoice.`
    : `${d.businessName} has confirmed your payment.`;

  const rows = [
    { label: `${noun} number`, value: d.documentNo },
    ...(d.title ? [{ label: 'For', value: d.title }] : []),
    isInvoice
      ? d.settled
        ? { label: d.settled.label, value: d.settled.value }
        : { label: 'Amount due', value: d.amount }
      : { label: 'Amount received', value: d.amount },
    { label: isInvoice ? 'Due date' : 'Payment date', value: d.date },
    ...(d.balance ? [{ label: d.balance.label, value: d.balance.value }] : []),
  ];

  const copyText = d.isSelfSend
    ? 'A copy for your records. Your client has not been sent anything.'
    : 'This is your copy of what your client received.';
  const copyNote = d.isVendorCopy ? emailPanel({ tone: 'info', body: escapeHtml(copyText) }) : '';

  const vendorMessage = d.vendorMessage
    ? emailPanel({
        title: `Message from ${d.businessName}`,
        body: escapeHtml(d.vendorMessage).replace(/\n/g, '<br />'),
      })
    : '';

  const payBlock = d.payThroughSinnapiUrl
    ? emailParagraph('This booking is paid securely through Sinnapi.') +
      emailButton(d.payThroughSinnapiUrl, 'Pay through Sinnapi') +
      emailFallbackLink(d.payThroughSinnapiUrl)
    : '';

  const portalBlock = d.portal
    ? emailButton(d.portal.documentUrl, `View ${noun.toLowerCase()} in ${APP_NAME}`, {
        variant: d.payThroughSinnapiUrl ? 'secondary' : 'primary',
      }) +
      emailParagraph(
        `Questions? <a href="${escapeUrl(d.portal.messagesUrl)}">Message ${escapeHtml(d.businessName)} in ${escapeHtml(APP_NAME)}</a>.`,
      )
    : emailParagraph(`Questions? Reply to this email to reach ${escapeHtml(d.businessName)}.`);

  const html = emailLayout({
    heading: `${noun} from ${d.businessName}`,
    preheader: subjectCore,
    body: [
      copyNote,
      emailParagraph(`Hello <strong>${escapeHtml(firstName)}</strong>,`),
      emailParagraph(`${escapeHtml(lead)} The PDF is attached to this email.`),
      emailDataTable(rows),
      vendorMessage,
      payBlock,
      portalBlock,
    ].join(''),
  });

  const text = emailText([
    ...(d.isVendorCopy ? [copyText, ''] : []),
    `Hello ${firstName},`,
    '',
    `${lead} The PDF is attached to this email.`,
    '',
    ...rows.map((r) => `  ${r.label}: ${r.value}`),
    '',
    ...(d.vendorMessage ? [`Message from ${d.businessName}:`, d.vendorMessage, ''] : []),
    ...(d.payThroughSinnapiUrl
      ? [`Pay securely through Sinnapi: ${d.payThroughSinnapiUrl}`, '']
      : []),
    ...(d.portal
      ? [
          `View it in ${APP_NAME}: ${d.portal.documentUrl}`,
          `Message ${d.businessName}: ${d.portal.messagesUrl}`,
        ]
      : [`Questions? Reply to this email to reach ${d.businessName}.`]),
  ]);

  return { subject, html, text };
}
