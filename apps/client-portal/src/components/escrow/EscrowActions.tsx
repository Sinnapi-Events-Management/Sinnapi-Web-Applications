import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from "@mui/material";
import { supabase } from "@/lib/supabase";

export default function EscrowActions({ escrowId, status }: { escrowId: string; status: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);

  function refresh() { qc.invalidateQueries({ queryKey: ["escrow"] }); }

  async function confirmRelease() {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc("client_confirm_release", { p_escrow_id: escrowId });
    setBusy(false);
    if (error) { setError(error.message); return; }
    refresh();
  }

  async function openDispute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const reason = String(new FormData(e.currentTarget).get("reason"));
    const { error } = await supabase.rpc("open_dispute", { p_escrow_id: escrowId, p_reason: reason });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDisputeOpen(false); refresh();
  }

  const canConfirm = status === "held";
  const canDispute = ["held", "release_requested"].includes(status);

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <Stack direction="row" spacing={1}>
        {canConfirm && <Button size="small" variant="contained" disabled={busy} onClick={confirmRelease}>Confirm & release</Button>}
        {canDispute && <Button size="small" color="error" variant="outlined" disabled={busy} onClick={() => setDisputeOpen(true)}>Raise dispute</Button>}
      </Stack>

      <Dialog open={disputeOpen} onClose={() => setDisputeOpen(false)} fullWidth maxWidth="sm" component="form" onSubmit={openDispute}>
        <DialogTitle>Raise a dispute</DialogTitle>
        <DialogContent><TextField name="reason" label="What went wrong?" multiline minRows={3} required autoFocus sx={{ mt: 1 }} /></DialogContent>
        <DialogActions>
          <Button onClick={() => setDisputeOpen(false)}>Cancel</Button>
          <Button type="submit" color="error" variant="contained" disabled={busy}>Submit dispute</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
