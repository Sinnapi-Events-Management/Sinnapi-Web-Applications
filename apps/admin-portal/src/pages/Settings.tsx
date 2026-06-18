import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import QueryState from "@/components/ui/QueryState";
import { useSettings } from "@/hooks/queries";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useSettings();
  const [edit, setEdit] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true); setErr(null);
    const raw = String(new FormData(e.currentTarget).get("value"));
    let value: unknown;
    try { value = JSON.parse(raw); } catch { setBusy(false); setErr("Value must be valid JSON (e.g. 10, \"UGX\", true)"); return; }
    const { error } = await supabase.from("platform_settings").update({ value }).eq("id", edit.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEdit(null); qc.invalidateQueries({ queryKey: ["settings"] });
  }

  return (
    <>
      <PageTitle title="Platform settings" subtitle="Commission %, grace period, FX, quote expiry, etc." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? <EmptyState title="No settings" /> : (
          <Card variant="outlined">
            <Table>
              <TableHead><TableRow><TableCell>Key</TableCell><TableCell>Value</TableCell><TableCell>Description</TableCell><TableCell align="right">Edit</TableCell></TableRow></TableHead>
              <TableBody>
                {rows.map((s: any) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.key}</TableCell>
                    <TableCell><code>{JSON.stringify(s.value)}</code></TableCell>
                    <TableCell>{s.description ?? "—"}</TableCell>
                    <TableCell align="right"><Button size="small" onClick={() => setEdit(s)}>Edit</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="xs" component="form" onSubmit={save}>
        <DialogTitle>Edit {edit?.key}</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          <TextField name="value" label="Value (JSON)" defaultValue={JSON.stringify(edit?.value)} fullWidth sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
