import { Card, CardContent, Typography, PageTitle, QueryState, StatusChip } from '@sinnapi/ui';
import QuotationBuilder from '@/components/quotation/QuotationBuilder';
import { one } from '@/lib/rel';
import type { ProfileRel } from '@/lib/types';
import { useQuotationDetail } from './hooks/useQuotationDetail';
import QuotationLineItems from './components/molecules/QuotationLineItems';
import { EmptyState } from '@sinnapi/ui/router';

export default function QuotationDetail() {
  const { quotation: q, isLoading, error, isEditable } = useQuotationDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!q ? (
        <EmptyState
          title="Quotation not found"
          ctaLabel="Back to quotations"
          ctaHref="/quotations"
        />
      ) : (
        <>
          <PageTitle
            title={`Quote ${q.reference_no}`}
            subtitle={one<ProfileRel>(q.profiles)?.full_name ?? undefined}
            action={<StatusChip status={q.status} size="medium" />}
          />
          {q.request_details && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Client request
                </Typography>
                <Typography>{q.request_details}</Typography>
              </CardContent>
            </Card>
          )}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {isEditable ? 'Build & send quote' : 'Quote sent'}
              </Typography>
              {isEditable ? (
                <QuotationBuilder quotationId={q.id} currency={q.currency ?? undefined} />
              ) : (
                <QuotationLineItems
                  items={q.quotation_items ?? []}
                  total={q.total}
                  currency={q.currency}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </QueryState>
  );
}
