import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Snackbar,
} from "@mui/material";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { supabase } from "@/lib/supabase";

export default function VendorActions({ vendorId }: { vendorId: string }) {
  const navigate = useNavigate();
  const [openQuote, setOpenQuote] = useState(false);
  const [openBooking, setOpenBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestQuote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const details = String(new FormData(e.currentTarget).get("details"));
    const { error } = await supabase.rpc("request_quotation", { p_vendor_id: vendorId, p_details: details, p_currency: "UGX" });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOpenQuote(false); setToast("Quote request sent"); navigate("/quotations");
  }

  async function requestBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.rpc("create_booking", {
      p_vendor_id: vendorId,
      p_event_date: String(form.get("event_date")),
      p_amount: Number(form.get("amount")) || 0,
      p_currency: "UGX",
      p_location: String(form.get("location")) || null,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOpenBooking(false); setToast("Booking request sent"); navigate("/bookings");
  }

  return (
    <>
      <Stack spacing={1.5}>
        <Button variant="contained" size="large" startIcon={<RequestQuoteIcon />} onClick={() => setOpenQuote(true)}>Request a quote</Button>
        <Button variant="outlined" size="large" startIcon={<EventAvailableIcon />} onClick={() => setOpenBooking(true)}>Request a booking</Button>
      </Stack>

      <Dialog open={openQuote} onClose={() => setOpenQuote(false)} fullWidth maxWidth="sm" component="form" onSubmit={requestQuote}>
        <DialogTitle>Request a quotation</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField name="details" label="Describe your event & requirements" multiline minRows={4} required autoFocus sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuote(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openBooking} onClose={() => setOpenBooking(false)} fullWidth maxWidth="sm" component="form" onSubmit={requestBooking}>
        <DialogTitle>Request a booking</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField name="event_date" type="date" label="Event date" InputLabelProps={{ shrink: true }} required />
            <TextField name="location" label="Location" />
            <TextField name="amount" type="number" label="Estimated amount (UGX)" inputProps={{ min: 0 }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBooking(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ""} />
    </>
  );
}
