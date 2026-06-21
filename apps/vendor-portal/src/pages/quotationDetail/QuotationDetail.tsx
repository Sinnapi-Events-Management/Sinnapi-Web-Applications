import {
  Card,
  CardContent,
  Typography,
  Divider,
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import EmptyState from '@/components/ui/EmptyState';
import QuotationBuilder from '@/components/quotation/QuotationBuilder';
import { formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ProfileRel } from '@/lib/types';
import { useQuotationDetail } from './hooks/useQuotationDetail';

export default function QuotationDetail() {
  const { quotation: q, isLoading, error } = useQuotationDetail();

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
              {['requested', 'draft', 'revised'].includes(q.status) ? (
                <>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Build & send quote
                  </Typography>
                  <QuotationBuilder quotationId={q.id} currency={q.currency ?? undefined} />
                </>
              ) : (
                <>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Quote sent
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      {(q.quotation_items ?? []).map((it) => (
                        <TableRow key={it.id}>
                          <TableCell>{it.description}</TableCell>
                          <TableCell align="right">
                            {it.quantity} × {formatMoney(it.unit_price, q.currency)}
                          </TableCell>
                          <TableCell align="right">
                            {formatMoney(it.line_total, q.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography variant="h6">Total: {formatMoney(q.total, q.currency)}</Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </QueryState>
  );
}
