// The vendor overview module: one RPC read, its wire shape, and the pure
// mapping to the view model every metric surface renders.
//
// Lives here rather than under `pages/dashboard` because it is no longer one
// page's concern — the dashboard leads with it and the Analytics page reads
// the same payload at the same period, which is what guarantees a figure can
// never differ between the two screens. A page reaching into another page's
// `schema/` folder for that guarantee was the coupling this module removes.
export * from './types';
export * from './queues';
export * from './presenter';
export * from './useVendorOverview';
