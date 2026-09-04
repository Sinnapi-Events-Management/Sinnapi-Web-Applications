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
// What the other side said about a quote, and how to word it for whoever is
// reading. Beside the transitions because it is the same record: the note is
// written by the transition and has nowhere else to live.
export * from './quotationFeedback';
export * from './bookingFromQuotation';
export * from './quotationPricing';
export * from './quotationLines';
// Quote packages — a vendor's published offer, priced in tiers. The logic
// first, then the two pieces every app composes a package out of.
export * from './packagePricing';
export * from './packageLines';
export * from './packageErrors';
export * from './packageQuery';
export * from './PackageScopeList';
export * from './PackageTierTabs';
// How a vendor charges. A set on a service, one value on a package — the two
// shapes share one vocabulary so a badge cannot mean different things on the
// vendor's card and the client's.
export * from './pricingModels';
export * from './PricingModelChip';
export * from './PricingModelPicker';
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
// Event budgets — what a client set aside, against what they have committed.
// Logic first, then the meter every portal draws it with. Deliberately apart
// from `statusColor`: that map binds `open` to error for reconciliation, and an
// event requirement that is `open` is the healthy starting state of a new plan.
export * from './eventBudget';
export * from './BudgetMeter';
export * from './BudgetStateChip';
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
// Faceted browse — the three pieces a searchable, filterable collection is
// built from. Shared rather than per-portal: the client's vendor discovery and
// the vendor's public-events feed had already forked identical copies.
export * from './FacetSelect';
export * from './LoadMoreResults';
export * from './FilterDisclosure';
// Status filter tabs for a list view — the same bar every portal's queues,
// inbox and dashboard navigate with.
export * from './StatusTabs';
// Section tabs for a *detail* page — the sibling of `StatusTabs`, splitting one
// long stack of cards into sections instead of filtering a list.
export * from './DetailTabs';
// The column layout those sections lay their cards out in — null-safe, so a
// card that decides it has nothing to say leaves no hole behind.
export * from './SectionGrid';
export * from './JsonBlock';
