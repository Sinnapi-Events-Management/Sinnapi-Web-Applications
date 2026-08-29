/**
 * A package's priced lines as a table, shared by all four apps.
 *
 * Pure data (no React/MUI), the companion to `packagePricing`: that one
 * decides what a tier adds up to, this one decides how a single line reads.
 * The split mirrors `quotationLines` / `quotationPricing`, and for the same
 * reason — a client comparing a vendor's public package against the quote they
 * were later sent is comparing two renderings of the same lines, and those two
 * must not disagree about what "2 × per guest" means.
 *
 * The quantity and unit price share a cell on purpose. Someone reading a
 * package is checking an arrangement in the terms they would describe it —
 * "two speakers at 900,000" — and splitting that across two columns makes them
 * reassemble it themselves, in a card that is often a phone's width.
 */
import { formatAmount } from './money';
import { packageLineAmount, packageQuantityLabel, type PackageLineLike } from './packagePricing';
import type { TableColumn } from '../organisms/tableColumns';

/** A line with a key that is stable for a render. */
export type PackageLineRow = PackageLineLike & { key: string };

/**
 * Key each line for the table.
 *
 * Positional fallback rather than content-derived: two identical lines are a
 * real thing on a package priced per day across two days, and they must not
 * collide into one row.
 */
export function packageLineRows(
  lines: readonly PackageLineLike[] | null | undefined,
): PackageLineRow[] {
  return (lines ?? []).map((line, index) => ({ ...line, key: line.id ?? `pkg-line-${index}` }));
}

/**
 * The three columns of a package breakdown. A factory because the currency
 * belongs to the package, not to any one line.
 *
 * `notes` rides under the description rather than taking a column of its own —
 * it is scope detail ("colour-matched to your theme"), and a fourth column
 * would cost the description the width it needs on a phone.
 */
export function packageLineColumns(
  currency: string | null | undefined,
): TableColumn<PackageLineRow>[] {
  const cur = currency ?? 'UGX';

  return [
    {
      field: 'description',
      headerName: 'Item',
      render: (line) => line.description || '—',
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      align: 'right',
      render: (line) => packageQuantityLabel(line),
    },
    {
      field: 'unit_price',
      headerName: 'Amount',
      align: 'right',
      render: (line) => formatAmount(packageLineAmount(line), cur),
    },
  ];
}
