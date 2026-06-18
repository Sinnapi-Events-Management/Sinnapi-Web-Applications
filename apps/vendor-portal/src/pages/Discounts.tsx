import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import QueryState from "@/components/ui/QueryState";
import VendorGate from "@/vendor/VendorGate";
import { useDiscounts } from "@/hooks/queries";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate } from "@/lib/config";

function DiscountsList({ vendorId }: { vendorId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useDiscounts(vendorId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from("discounts").insert({
      vendor_id: vendorId,
      code: String(form.get("code")) || null,
      type: String(form.get("type")),
      value: Number(form.get("value")),
      currency: String(form.get("type")) === "fixed" ? "UGX" : null,
      max_uses: form.get("max_uses") ? Number(form.get("max_uses")) : null,
      starts_at: String(form.get("starts_at")),
      ends_at: String(form.get("ends_at")),
      is_active: true,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["v-discounts", vendorId] });
  }

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New discount</Button>
      </Stack>
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No discounts" description="Create discount codes for your clients." />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell><TableCell>Value</TableCell><TableCell>Uses</TableCell>
                  <TableCell>Window</TableCell><TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((d: any) => (
                  <TableRow key={d.id} hover>
                    <TableCell>{d.code ?? "—"}</TableCell>
                    <TableCell>{d.type === "percentage" ? `${d.value}%` : formatMoney(d.value, d.currency)}</TableCell>
                    <TableCell>{d.used_count}{d.max_uses ? ` / ${d.max_uses}` : ""}</TableCell>
                    <TableCell>{formatDate(d.starts_at)} – {formatDate(d.ends_at)}</TableCell>
                    <TableCell><Chip size="small" label={d.is_active ? "Active" : "Inactive"} color={d.is_active ? "success" : "default"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" component="form" onSubmit={add}>
        <DialogTitle>New discount</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField name="code" label="Code (optional)" />
            <Stack direction="row" spacing={2}>
              <TextField name="type" label="Type" select defaultValue="percentage" sx={{ flex: 1 }}>
                <MenuItem value="percentage">Percentage</MenuItem>
                <MenuItem value="fixed">Fixed (UGX)</MenuItem>
              </TextField>
              <TextField name="value" type="number" label="Value" required sx={{ flex: 1 }} inputProps={{ min: 0 }} />
            </Stack>
            <TextField name="max_uses" type="number" label="Max uses (optional)" inputProps={{ min: 1 }} />
            <Stack direction="row" spacing={2}>
              <TextField name="starts_at" type="date" label="Starts" InputLabelProps={{ shrink: true }} required />
              <TextField name="ends_at" type="date" label="Ends" InputLabelProps={{ shrink: true }} required />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving…" : "Create"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function Discounts() {
  return (
    <>
      <PageTitle title="Discounts" subtitle="Discount codes for your clients." />
      <VendorGate>{(vendorId) => <DiscountsList vendorId={vendorId} />}</VendorGate>
    </>
  );
}
