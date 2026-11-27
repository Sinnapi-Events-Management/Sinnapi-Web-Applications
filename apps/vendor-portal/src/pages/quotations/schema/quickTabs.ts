/** The one-tap views over the quotations list, in the order they are shown. */
export const QUOTE_QUICK_TABS = [
  { value: 'price', label: 'To price' },
  { value: 'changes', label: 'Changes asked' },
  { value: 'sent', label: 'Sent' },
  { value: 'all', label: 'All' },
] as const;

export type QuoteQuickTab = (typeof QUOTE_QUICK_TABS)[number]['value'];

/** The status each view filters to; `all` clears it. */
export const QUOTE_TAB_STATUS: Record<QuoteQuickTab, string> = {
  price: 'requested',
  changes: 'revised',
  sent: 'sent',
  all: '',
};
