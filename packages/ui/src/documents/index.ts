// Documents kit — vendor invoices and receipts, shared by the vendor portal
// (which writes them), the client portal (which receives them) and the PDF
// renderer in @sinnapi/utils (which prints them).
//
// One kit rather than one per portal for the same reason as the payments
// kit: a vendor and their client must be looking at the same document, and
// two copies of a layout drift the first time one of them is restyled.
//
// Router-free and data-client-free. Each portal owns its queries; only the
// types, the money rules and the drawing live here.
export * from './core';
export * from './documentErrors';

export * from './atoms/DocumentStatusChip';
export * from './atoms/PaperLabel';
export * from './molecules/PaperField';
export * from './molecules/VendorBrandBlock';
export * from './molecules/DocumentHeading';
export * from './molecules/InvoiceLinesTable';
export * from './molecules/MoneyRows';
export * from './molecules/DocumentListCard';
export * from './organisms/DocumentPaper';
export * from './organisms/InvoicePreview';
export * from './organisms/ReceiptPreview';
