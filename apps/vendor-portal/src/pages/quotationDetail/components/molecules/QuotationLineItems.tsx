import { useMemo } from 'react';
import { Divider, SimpleTable } from '@sinnapi/ui';
import type { QuotationDetailModel, QuotationItemModel } from '@/lib/types';
import { getLineItemColumns } from '../../schema';
import QuotationTotals from './QuotationTotals';

type QuotationLineItemsProps = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
};

/** A sent quote's breakdown: its line items and how they add up. */
export default function QuotationLineItems({ quotation, items }: QuotationLineItemsProps) {
  const columns = useMemo(() => getLineItemColumns(quotation.currency), [quotation.currency]);

  return (
    <>
      <SimpleTable
        columns={columns}
        rows={items}
        getRowId={(it) => it.id}
        minWidth={420}
        emptyMessage="This quote has no line items."
      />
      <Divider sx={{ my: 2.5 }} />
      <QuotationTotals quotation={quotation} />
    </>
  );
}
