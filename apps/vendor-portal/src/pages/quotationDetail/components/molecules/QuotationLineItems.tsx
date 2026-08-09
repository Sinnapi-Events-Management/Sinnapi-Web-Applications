import { useMemo } from 'react';
import { Box, Divider, SimpleTable, Typography } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import type { QuotationItemModel } from '@/lib/types';
import { getLineItemColumns } from '../../schema';

type QuotationLineItemsProps = {
  items: QuotationItemModel[];
  total: number | null;
  currency: string | null;
};

/** A sent quote's breakdown: its line items and the total they add up to. */
export default function QuotationLineItems({ items, total, currency }: QuotationLineItemsProps) {
  const columns = useMemo(() => getLineItemColumns(currency), [currency]);

  return (
    <>
      <SimpleTable
        columns={columns}
        rows={items}
        getRowId={(it) => it.id}
        emptyMessage="This quote has no line items."
      />
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Typography variant="h6">Total: {formatMoney(total, currency)}</Typography>
      </Box>
    </>
  );
}
