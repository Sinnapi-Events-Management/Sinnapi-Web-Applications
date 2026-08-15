import { useMemo } from 'react';
import { Divider, SectionCard, SimpleTable, Typography } from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { QuotationDetailModel, QuotationItemModel } from '@/lib/types';
import { getLineItemColumns } from '../../schema';
import QuotationTotals from '../molecules/QuotationTotals';

type Props = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
  isPriced: boolean;
};

/**
 * What the price actually buys, line by line, and how those lines add up.
 *
 * An unpriced quote gets a sentence instead of an empty table with a zero
 * under it. "The vendor has not built this yet" is a state worth naming — it
 * tells the client the ball is not in their court, which an empty grid does
 * not.
 */
export default function QuotationItemsCard({ quotation: q, items, isPriced }: Props) {
  const columns = useMemo(() => getLineItemColumns(q.currency), [q.currency]);

  return (
    <SectionCard
      title="What this covers"
      icon={<ReceiptLongIcon />}
      subtitle={isPriced ? `${items.length} item${items.length === 1 ? '' : 's'}` : undefined}
    >
      {!isPriced ? (
        <Typography variant="body2" color="text.secondary">
          The vendor has not priced this request yet. You will be notified when their quote arrives.
        </Typography>
      ) : (
        <>
          <SimpleTable
            columns={columns}
            rows={items}
            getRowId={(it) => it.id}
            minWidth={420}
            emptyMessage="This quote has no line items."
          />
          <Divider sx={{ my: 2.5 }} />
          <QuotationTotals quotation={q} />
        </>
      )}
    </SectionCard>
  );
}
