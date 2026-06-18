import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Table, TableHead, TableRow, TableCell, TableBody, Button, Alert } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import QueryState from "@/components/ui/QueryState";
import { useEscrowAdmin } from "@/hooks/queries";
import { useAdmin } from "@/admin/AdminProvider";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/config";
import { one } from "@/lib/rel";

export default function Escrow() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data, isLoading, error } = useEscrowAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function approveRelease(escrowId: string) {
    setBusy(escrowId); setErr(null);
    // maker-checker: client must have confirmed first; this is the admin approval
    const { error } = await supabase.rpc("approve_escrow_release", { p_escrow_id: escrowId });
    setBusy(null);
    if (error) { setErr(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-escrow"] });
    qc.invalidateQueries({ queryKey: ["admin-payouts"] });
  }

  return (
    <>
      <PageTitle title="Escrow" subtitle="Approve releases once the client has confirmed. Approval creates a payout for Finance to process." />
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No escrow transactions" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Booking</TableCell><TableCell>Vendor</TableCell><TableCell align="right">Gross</TableCell>
                  <TableCell align="right">Net</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((e: any) => (
                  <TableRow key={e.id} hover>
                    <TableCell>{one<any>(e.bookings)?.reference_no ?? "—"}</TableCell>
                    <TableCell>{one<any>(e.vendors)?.business_name ?? "—"}</TableCell>
                    <TableCell align="right">{formatMoney(e.gross_amount, e.currency)}</TableCell>
                    <TableCell align="right">{formatMoney(e.net_payout_amount, e.currency)}</TableCell>
                    <TableCell><StatusChip status={e.status} /></TableCell>
                    <TableCell align="right">
                      {has("escrow.release") && e.status === "release_requested" && (
                        <Button size="small" variant="contained" disabled={busy === e.id} onClick={() => approveRelease(e.id)}>Approve release</Button>
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
