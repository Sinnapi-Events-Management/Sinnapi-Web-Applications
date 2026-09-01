'use client';
import { useMemo } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MoneyBreakdown } from '../molecules/MoneyBreakdown';
import { formatAmount } from '../molecules/money';
import { packageLineColumns, packageLineRows } from '../molecules/packageLines';
import {
  packageLineAmount,
  packageQuantityLabel,
  type PackageLineLike,
  type PackageTierPricing,
} from '../molecules/packagePricing';
import { SimpleTable } from './SimpleTable';

export type PackageTierBreakdownProps = {
  pricing: PackageTierPricing;
  /** Add-ons offered across every tier, on top of the tier's own optional lines. */
  sharedAddOns?: readonly PackageLineLike[];
  /** Label on the summed figure — "Package total" reads oddly inside a quote. */
  totalLabel?: string;
  /**
   * A campaign discount already folded into `pricing`, shown as its own line.
   *
   * Deliberately a plain label/amount rather than an `OfferModel`: this
   * component's job is to itemise a number, and giving it an offer type would
   * make the breakdown reach into offer copy, offer scope and offer pricing to
   * render one row. The caller has already applied the offer — `applyOfferToTier`
   * recomputes net, tax and total — and passes the line that explains it.
   *
   * Kept SEPARATE from `pricing.discount`, which is the tier's own rate. Two
   * lines because a client is entitled to see which reduction came with the
   * package and which came from their code, and one summed line can never say.
   */
  offerLine?: { label: string; amount: number; hint?: string };
};

/**
 * One tier, itemised, ending in the number a client would pay for it.
 *
 * The included lines are a table and the add-ons are a list, and the
 * difference is load-bearing. Everything inside the table is inside the total
 * below it; everything in the list is a price the client can choose to add.
 * Rendering both as rows of one table is exactly how a client comes to believe
 * a package costs more — or less — than it does.
 *
 * Discount and tax rows are dropped when zero rather than shown as `UGX 0`:
 * most packages carry neither, and a row reporting a non-event is still a row
 * the eye has to read.
 */
export function PackageTierBreakdown({
  pricing,
  sharedAddOns = [],
  totalLabel = 'Package total',
  offerLine,
}: PackageTierBreakdownProps) {
  const rows = useMemo(() => packageLineRows(pricing.includedLines), [pricing.includedLines]);
  const columns = useMemo(() => packageLineColumns(pricing.currency), [pricing.currency]);
  const addOns = useMemo(
    () => [...pricing.optionalLines, ...sharedAddOns],
    [pricing.optionalLines, sharedAddOns],
  );

  return (
    <Stack spacing={2.5}>
      <SimpleTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.key}
        minWidth={360}
        emptyMessage="This tier has no priced lines yet."
      />

      {pricing.isPriced && (
        <MoneyBreakdown
          currency={pricing.currency}
          lines={[
            { label: 'Subtotal', amount: pricing.base },
            ...(pricing.discount > 0
              ? [
                  {
                    label: `Discount (${pricing.discountRate}%)`,
                    amount: -pricing.discount,
                    hint: 'Applied by the vendor to this tier.',
                  },
                ]
              : []),
            ...(offerLine && offerLine.amount > 0
              ? [
                  {
                    label: offerLine.label,
                    amount: -offerLine.amount,
                    hint:
                      offerLine.hint ??
                      'A promotion on this package, applied on top of the vendor’s tier price.',
                  },
                ]
              : []),
            ...(pricing.tax > 0
              ? [
                  {
                    label: `Tax (${pricing.taxRate}%)`,
                    amount: pricing.tax,
                    additive: !pricing.taxInclusive,
                    muted: pricing.taxInclusive,
                    hint: pricing.taxInclusive
                      ? 'Already included in the prices above — shown so the tax component is on the record.'
                      : 'Added on top of the prices above.',
                  },
                ]
              : []),
          ]}
          total={{ label: totalLabel, amount: pricing.total }}
          footnote={
            pricing.taxInclusive && pricing.tax > 0
              ? 'Prices include tax. The total is what you pay.'
              : undefined
          }
        />
      )}

      {addOns.length > 0 && <PackageAddOns addOns={addOns} currency={pricing.currency} />}
    </Stack>
  );
}

/**
 * The extras, priced but deliberately outside the total.
 *
 * Set apart in its own tinted block, with the sentence that makes the boundary
 * explicit. The vendor decides which of these a given client is getting when
 * they build the quote — a client is never left to work out whether ticking
 * something changed the price they were just shown.
 */
function PackageAddOns({
  addOns,
  currency,
}: {
  addOns: readonly PackageLineLike[];
  currency: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.secondary.main, t.palette.mode === 'dark' ? 0.12 : 0.05),
        border: (t) => `1px solid ${alpha(t.palette.secondary.main, 0.2)}`,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700}>
        Optional add-ons
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Not included in the total above. Ask for any of these and the vendor will price them into
        your quote.
      </Typography>

      <Divider sx={{ my: 1.5 }} />

      <Stack spacing={1}>
        {addOns.map((line, index) => (
          <Stack
            key={line.id ?? `add-on-${index}`}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.25, sm: 1 }}
            alignItems={{ xs: 'flex-start', sm: 'baseline' }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2">{line.description || '—'}</Typography>
              {line.notes && (
                <Typography variant="caption" color="text.secondary">
                  {line.notes}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {packageQuantityLabel(line)}
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
              {formatAmount(packageLineAmount(line), currency)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
