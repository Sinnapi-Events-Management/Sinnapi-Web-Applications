import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Button,
} from '@sinnapi/ui';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { useQuotations } from '@/hooks/queries';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorNameSlugRefModel } from '@/lib/types';

export default function Quotations() {
  const { data, isLoading, error } = useQuotations();
  const rows = data ?? [];

  return (
    <>
      <PageTitle
        title="Quotations"
        subtitle="Review and compare quotes from vendors."
        action={
          <Button
            component={RouterLink}
            to="/quotations/compare"
            variant="outlined"
            startIcon={<CompareArrowsIcon />}
          >
            Compare
          </Button>
        }
      />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No quotations yet"
            description="Request a quote from a vendor to get started."
            ctaLabel="Discover vendors"
            ctaHref="/discover"
          />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Valid until</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell>
                      <Typography variant="body2">{q.reference_no}</Typography>
                    </TableCell>
                    <TableCell>
                      {one<VendorNameSlugRefModel>(q.vendors)?.business_name ?? '—'}
                    </TableCell>
                    <TableCell align="right">{formatMoney(q.total, q.currency)}</TableCell>
                    <TableCell>{formatDate(q.valid_until)}</TableCell>
                    <TableCell>
                      <StatusChip status={q.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>
    </>
  );
}
