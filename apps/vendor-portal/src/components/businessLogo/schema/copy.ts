/**
 * Every word the business-logo flow says, in one place.
 *
 * Plain language on purpose (see the plain-language labels rule): vendors
 * are not designers, so this talks about "your logo" and "your documents",
 * never formats, aspect ratios or DPI.
 */
export const LOGO_COPY = {
  subject: 'business logo',
  toast: {
    updated: 'Your business logo has been saved.',
    removed: 'Your business logo has been removed.',
  },
  helper:
    'PNG with a clear background looks best. Wide or square logos both work — we never crop them.',
  dialog: {
    title: 'Add your business logo',
    body: 'Your logo appears at the top of every quotation, invoice and receipt your clients receive. Add it once and we will use it everywhere.',
    continueLabel: 'Continue',
    cancelLabel: 'Not now',
    previewLabel: 'How it looks on your documents',
  },
  reuse: {
    title: 'Use the photo you already added?',
    body: 'This is the photo from when you set up your account.',
    action: 'Use this as my logo',
  },
  banner: {
    title: 'Add your business logo',
    body: 'You need a logo before you can send quotations, invoices or receipts.',
    action: 'Add logo',
  },
} as const;

/** The moment the gate interrupted, so the dialog can say why it opened. */
export type LogoGateReason = 'quotation' | 'invoice' | 'receipt' | 'package' | 'general';

export const LOGO_GATE_LEAD: Record<LogoGateReason, string> = {
  quotation: 'Before you send this quotation, add your business logo.',
  invoice: 'Before you issue this invoice, add your business logo.',
  receipt: 'Before you record this receipt, add your business logo.',
  package: 'Before you approve this order, add your business logo.',
  general: LOGO_COPY.dialog.body,
};
