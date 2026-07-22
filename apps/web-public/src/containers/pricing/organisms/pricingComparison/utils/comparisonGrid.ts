/**
 * The shared grid template for the comparison table, so the header and every
 * row stay aligned.
 *
 * Built from the column count rather than fixed at four, because the catalogue
 * is admin-authored: adding a fourth tier in the portal used to leave the
 * header and the rows describing different columns.
 *
 * `minWidth` scales with it too — the table sits in a horizontal scroll shell,
 * and columns that squeeze below ~130px stop being readable on a phone.
 */
export function comparisonGrid(columnCount: number) {
  return {
    display: 'grid',
    gridTemplateColumns: `1.6fr repeat(${columnCount}, minmax(96px, 1fr))`,
    alignItems: 'center',
    minWidth: 320 + columnCount * 110,
  };
}
