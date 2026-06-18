import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Table, TableHead, TableRow, TableCell, TableBody, Button, Alert } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import QueryState from "@/components/ui/QueryState";
import { useRefundsAdmin } from "@/hooks/queries";
import { useAdmin } from "@/admin/AdminProvider";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate, titleize } from "@/lib/config";

export default function Refunds() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data, isLoading, error } = useRefundsAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function approve(id: string) {
    setBusy(id); setErr(null);
    const { error } = await supabase.rpc("approve_refund", { p_refund_id: id });
    setBusy(null);
    if (error) { setErr(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-refunds"] });
  }

  return (
    <>
      <PageTitle title="Refunds" subtitle="Approve refunds (partial allowed). Approver must differ from requester." />
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No refund requests" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell><TableCell align="right">Amount</TableCell><TableCell>Reason</TableCell>
                  <TableCell>Requested</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{titleize(r.type)}</TableCell>
                    <TableCell align="right">{formatMoney(r.amount, r.currency)}</TableCell>
                    <TableCell>{r.reason ?? "—"}</TableCell>
                    <TableCell>{formatDate(r.created_at)}</TableCell>
                    <TableCell><StatusChip status={r.status} /></TableCell>
                    <TableCell align="right">
                      {has("refund.approve") && r.status === "requested" && (
                        <Button size="small" variant="contained" disabled={busy === r.id} onClick={() => approve(r.id)}>Approve</Button>
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
