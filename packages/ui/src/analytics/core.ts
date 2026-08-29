// The analytics vocabulary — the shapes, reporting windows, formatters and slice
// builders every tile and chart in this module speaks.
//
// Split out from `index.ts` so the components can import it without importing
// themselves back through the module barrel.
export * from './types';
export * from './periods';
export * from './format';
export * from './series';
