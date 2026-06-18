import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Grid, Card, CardContent, Typography, Stack, TextField, Button, List, ListItem, ListItemText, IconButton, Chip, Alert } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PageTitle from "@/components/ui/PageTitle";
import QueryState from "@/components/ui/QueryState";
import VendorGate from "@/vendor/VendorGate";
import { useBlockedDates } from "@/hooks/queries";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/config";

function CalendarManager({ vendorId }: { vendorId: string }) {
  const qc = useQueryClient();
  const blocked = useBlockedDates(vendorId);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function block(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from("vendor_blocked_dates").insert({
      vendor_id: vendorId, blocked_date: date, reason: reason || null, source: "manual",
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDate(""); setReason("");
    qc.invalidateQueries({ queryKey: ["v-blocked", vendorId] });
  }

  async function unblock(id: string) {
    await supabase.from("vendor_blocked_dates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["v-blocked", vendorId] });
  }

  const rows = blocked.data ?? [];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Block a date</Typography>
            {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
            <Stack component="form" spacing={2} onSubmit={block}>
              <TextField type="date" label="Date" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} required />
              <TextField label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: "flex-start" }}>Block date</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Unavailable dates</Typography>
            <QueryState isLoading={blocked.isLoading} error={blocked.error}>
              {rows.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No blocked dates.</Typography>
              ) : (
                <List>
                  {rows.map((b: any) => (
                    <ListItem key={b.id} secondaryAction={
                      b.source === "manual"
                        ? <IconButton edge="end" aria-label="Remove" onClick={() => unblock(b.id)}><DeleteIcon /></IconButton>
                        : <Chip size="small" label="Booking" />
                    }>
                      <ListItemText primary={formatDate(b.blocked_date)} secondary={b.reason ?? undefined} />
                    </ListItem>
                  ))}
                </List>
              )}
            </QueryState>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default function Calendar() {
  return (
    <>
      <PageTitle title="Calendar & availability" subtitle="Block dates you're unavailable. Confirmed bookings block dates automatically." />
      <VendorGate>{(vendorId) => <CalendarManager vendorId={vendorId} />}</VendorGate>
    </>
  );
}
