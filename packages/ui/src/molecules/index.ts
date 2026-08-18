// Molecules — small compositions of atoms.
export * from './Button';
export * from './Card';
export * from './FormField';
export * from './FileUpload';
export * from './SearchField';
export * from './Accordion';
export * from './Alert';
export * from './Snackbar';
// `Snackbar` is the raw primitive; reach for `Toast` to say something
// happened — it is the severity-coloured bar every portal shares.
export * from './toast';
export * from './Breadcrumbs';
export * from './Pagination';
export * from './Tabs';
export * from './List';
export * from './Menu';
export * from './Stepper';
export * from './SpeedDial';
export * from './Autocomplete';
export * from './datePicker';
export * from './ImageList';
export * from './ThemeToggle';
// Portal primitives — shared by admin, client and vendor. (`StatCard` and
// `EmptyState` are their router-dependent siblings, in `@sinnapi/ui/router`.)
export * from './PageTitle';
export * from './QueryState';
export * from './StatusChip';
export * from './statusColor';
export * from './rpcError';
export * from './bookingTransitions';
export * from './quotationTransitions';
export * from './bookingFromQuotation';
export * from './quotationPricing';
export * from './quotationLines';
// The quotation as every portal reads it: its identity and dates, and how the
// booking made from it compares to what was quoted.
export * from './QuotationSummaryRows';
export * from './QuoteVarianceNote';
export * from './EventContextRows';
export * from './AdvanceTermsRows';
export * from './HeroMeta';
export * from './IconBadge';
export * from './ActionNote';
export * from './InfoRow';
export * from './PasswordStrength';
export * from './MarketingConsent';
export * from './money';
export * from './datetime';
export * from './MoneyBreakdown';
// Payment terms — the rail as a term of the deal. Logic first, then the four
// surfaces that render it: the client's priced comparison, one card of it, the
// itemised cost of the chosen rail, and the state of the negotiation.
export * from './paymentTerms';
export * from './PaymentRailOption';
export * from './PaymentTermsPicker';
export * from './PaymentTermsBreakdown';
export * from './PaymentTermsNotice';
export * from './PaymentRailChoice';
export * from './PaymentTermsChip';
// The payment window — the clock a client has to fund an escrow booking, and
// what a vendor or an admin may do about one that runs out. Logic first, then
// the two surfaces every portal renders it through.
export * from './paymentWindow';
export * from './PaymentWindowChip';
export * from './PaymentDeadline';
// Post-event settlement — the vendor's ask, the client's answer, and the
// figure all three parties consented to. Logic first, then the pieces that
// render it identically wherever it is shown.
export * from './settlement';
export * from './SettlementFigures';
export * from './SettlementDeadline';
export * from './SettlementTrail';
