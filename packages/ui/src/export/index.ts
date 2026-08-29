// Tabular export kit — the shared "download what this screen is showing"
// surface for every SPA portal.
//
// Outside the root barrel because `xlsx`, `jspdf` and `jspdf-autotable` are
// optional peer dependencies that only the SPA portals install; the Next.js
// `web-public` app must never pull them into its module graph. Import from
// `@sinnapi/ui/export`.
export * from './types';
export * from './exportTables';
// `./serializers` is intentionally NOT re-exported: importing it would defeat
// the code split that keeps xlsx/jspdf out of every portal's first paint.
export { ExportMenu, type ExportMenuProps } from './ExportMenu';
