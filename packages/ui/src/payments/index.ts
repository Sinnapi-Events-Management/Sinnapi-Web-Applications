// Payments kit — what the client portal (escrow funding) and the vendor
// portal (subscriptions) share about a hosted checkout: the rails, the
// picker, the shape of the PSP's return, the poll schedule for the return
// page, and the translation of a failure reason.
//
// Router-free and data-client-free by construction. Each portal owns the
// hook that reads its own payment row and the cards that say what the
// payment was *for*; only the parts that are true of every checkout live here.
export * from './rails';
export * from './returnParams';
export * from './poll';
export * from './failureReasons';
export * from './CheckoutRailPicker';
export * from './NextStepsList';
