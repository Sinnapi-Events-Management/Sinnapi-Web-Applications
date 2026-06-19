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
  Stack,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { usePayoutsAdmin } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import { formatMoney, formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorRef } from '@/lib/types';

export default function Payouts() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data, isLoading, error } = usePayoutsAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-payouts'] });
  }

  // maker-checker: approver must differ from the requester (enforced in the RPC)
  async function approve(id: string) {
    setBusy(id);
    setErr(null);
    const { error } = await supabase.rpc('approve_payout', { p_payout_id: id });
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    refresh();
  }

  // disbursement runs server-side in the psp-payout Edge Function (uses the
  // audited bank-decrypt RPC); we invoke it with the caller's JWT.
  async function process(id: string) {
    setBusy(id);
    setErr(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/psp-payout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payoutId: id }),
    });
    setBusy(null);
    if (!res.ok) {
      setErr((await res.json().catch(() => ({})))?.error ?? 'Payout failed');
      return;
    }
    refresh();
  }

  return (
    <>
      <PageTitle
        title="Payouts"
        subtitle="Approve (Finance) then process disbursement. Approver must differ from requester."
      />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No payouts" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{one<VendorRef>(p.vendors)?.business_name ?? '—'}</TableCell>
                    <TableCell align="right">
                      <strong>{formatMoney(p.amount, p.currency)}</strong>
                    </TableCell>
                    <TableCell>{formatDate(p.created_at)}</TableCell>
                    <TableCell>
                      <StatusChip status={p.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {has('payout.approve') && p.status === 'requested' && (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={busy === p.id}
                            onClick={() => approve(p.id)}
                          >
                            Approve
                          </Button>
                        )}
                        {has('payout.process') && p.status === 'approved' && (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={busy === p.id}
                            onClick={() => process(p.id)}
                          >
                            Process
                          </Button>
                        )}
                      </Stack>
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
