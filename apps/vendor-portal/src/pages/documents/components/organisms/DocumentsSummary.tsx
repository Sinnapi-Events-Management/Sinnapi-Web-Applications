import { Box, Card, CardContent, Skeleton, Stack, Typography } from '@sinnapi/ui';
import { formatDocumentMoney } from '@sinnapi/ui/documents';
import { useDocumentSummary } from '@/hooks/documentQueries';

/**
 * What clients still owe, per currency — two currencies are never added
 * together. Hidden until there is something outstanding: a new vendor's
 * first visit should lead with "New invoice", not a row of zeros.
 */
export default function DocumentsSummary({ vendorId }: { vendorId: string }) {
  const { data, isLoading } = useDocumentSummary(vendorId);

  if (isLoading) return <Skeleton variant="rounded" height={92} />;
  if (!data || data.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(260px, 1fr))' },
        gap: 1.5,
      }}
    >
      {data.map((row) => (
        <Card key={row.currency} variant="outlined">
          <CardContent
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
              '&:last-child': { pb: 2 },
            }}
          >
            <Stack spacing={0.25}>
              <Typography variant="body2" color="text.secondary">
                Still owed · {row.open_count} {row.open_count === 1 ? 'invoice' : 'invoices'}
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDocumentMoney(row.outstanding, row.currency)}
              </Typography>
            </Stack>
            <Stack spacing={0.25} alignItems="flex-end">
              <Typography variant="body2" color="text.secondary">
                Overdue
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                color={row.overdue_count ? 'warning.main' : 'text.primary'}
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {row.overdue_count}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
