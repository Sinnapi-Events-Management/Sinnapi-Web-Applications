import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useVendorsAdmin } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export default function Vendors() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useVendorsAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function setStatus(id: string, status: 'active' | 'suspended') {
    setBusy(id);
    setErr(null);
    const { error } = await supabase
      .from('vendors')
      .update({ status, visibility: status === 'active' ? 'public' : 'hidden' })
      .eq('id', id);
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-vendors'] });
  }

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
