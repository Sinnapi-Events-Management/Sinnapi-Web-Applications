export const TABS = [
  { value: 'invoices', label: 'Invoices' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'clients', label: 'My clients' },
] as const;

export type DocumentsTab = (typeof TABS)[number]['value'];

export function isDocumentsTab(v: string | null): v is DocumentsTab {
  return TABS.some((t) => t.value === v);
}
