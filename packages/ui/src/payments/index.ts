// Payments kit — what the client portal (escrow funding) and the vendor
// portal (subscriptions) share about a hosted checkout: the rails, the
// picker, the shape of the PSP's return, the poll schedule for the return
// page, the translation of a failure reason, and the frame every outcome of
// a checkout is told in.
//
// Router-free and data-client-free by construction. Each portal owns the
// hook that reads its own payment row and the cards that say what the
// payment was *for*; only the parts that are true of every checkout live here.
//
// The outcome frame is deliberately shared rather than forked per portal: an
// escrow funding and a subscription are different payments with the same four
// endings, and two copies of "payment successful" drift apart the first time
// one of them is restyled.
export * from './rails';
export * from './returnParams';
export * from './poll';
export * from './failureReasons';
export * from './CheckoutRailPicker';
export * from './FxConfirmationDialog';
export * from './NextStepsList';

// Checkout frame — atoms up. Shared by the escrow and subscription checkouts
// for the same reason as the outcome frame below: one payment dialog, not two
// that drift.
export * from './atoms/ProviderLogo';
export * from './atoms/PesapalLogo';
export * from './atoms/RadioIndicator';
export * from './molecules/CheckoutRailCard';
export * from './molecules/CheckoutActions';
export * from './molecules/CheckoutSection';
export * from './molecules/CheckoutDialogHeader';
export * from './molecules/SecureCheckoutNote';
export * from './molecules/FxAmountHero';
export * from './molecules/FxRateLines';
export * from './molecules/FxLockNotice';
export * from './organisms/CheckoutSummaryPanel';
export * from './organisms/CheckoutDialogFrame';
export * from './hooks/useCheckoutDialogLayout';
export * from './hooks/useRadioGroupNavigation';
export * from './hooks/useFxCountdown';

// Outcome frame — atoms up.
export * from './atoms/OutcomeMark';
export * from './atoms/ReceiptTotal';
export * from './molecules/OutcomeHeader';
export * from './molecules/OutcomeActions';
export * from './organisms/OutcomeLayout';
export * from './organisms/OutcomeCard';
export * from './organisms/ReceiptPanel';
export * from './organisms/PaymentFactsPanel';
export * from './hooks/useReceiptDisclosure';
