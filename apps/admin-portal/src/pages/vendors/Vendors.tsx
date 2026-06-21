import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Alert,
  Rating,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { useVendors } from './hooks/useVendors';

export default function Vendors() {
  const { rows, isLoading, error, busy, err, setStatus } = useVendors();

  return (
    <>
      <PageTitle title="Vendors" subtitle="Monitor and manage vendor listings." />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No vendors" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Business</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Visibility</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell>{v.business_name}</TableCell>
                    <TableCell>
                      <Rating value={v.avg_rating} size="small" readOnly precision={0.5} /> (
                      {v.review_count})
                    </TableCell>
                    <TableCell>
                      <StatusChip status={v.visibility} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={v.status} />
                    </TableCell>
                    <TableCell align="right">
                      {v.status === 'active' ? (
                        <Button
                          size="small"
                          color="error"
                          disabled={busy === v.id}
                          onClick={() => setStatus(v.id, 'suspended')}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          disabled={busy === v.id}
                          onClick={() => setStatus(v.id, 'active')}
                        >
                          Activate
                        </Button>
                      )}
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
