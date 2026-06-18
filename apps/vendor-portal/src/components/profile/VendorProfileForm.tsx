import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Stack, TextField, Button, Alert, MenuItem, Snackbar } from "@mui/material";
import { supabase } from "@/lib/supabase";

type Vendor = {
  id: string; business_name: string; biography: string | null; base_city: string | null;
  website: string | null; starting_price: number | null; starting_price_currency: string | null;
};

// NOTE: editing sensitive fields (banking, ID) triggers re-verification server-side.
export default function VendorProfileForm({ vendor }: { vendor: Vendor }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from("vendors").update({
      business_name: String(form.get("business_name")),
      biography: String(form.get("biography")) || null,
      base_city: String(form.get("base_city")) || null,
      website: String(form.get("website")) || null,
      starting_price: form.get("starting_price") ? Number(form.get("starting_price")) : null,
      starting_price_currency: String(form.get("currency")),
    }).eq("id", vendor.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setToast(true);
    qc.invalidateQueries({ queryKey: ["my-vendor"] });
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={save} sx={{ maxWidth: 560 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField name="business_name" label="Business name" defaultValue={vendor.business_name} required />
      <TextField name="base_city" label="Base city" defaultValue={vendor.base_city ?? ""} />
      <TextField name="website" label="Website" defaultValue={vendor.website ?? ""} />
      <TextField name="biography" label="Business bio" multiline minRows={4} defaultValue={vendor.biography ?? ""} />
      <Stack direction="row" spacing={2}>
        <TextField name="starting_price" type="number" label="Starting price" defaultValue={vendor.starting_price ?? ""} inputProps={{ min: 0 }} />
        <TextField name="currency" label="Currency" select defaultValue={vendor.starting_price_currency ?? "UGX"} sx={{ width: 140 }}>
          <MenuItem value="UGX">UGX</MenuItem>
          <MenuItem value="USD">USD</MenuItem>
        </TextField>
      </Stack>
      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: "flex-start" }}>{busy ? "Saving…" : "Save changes"}</Button>
      <Snackbar open={toast} autoHideDuration={3000} onClose={() => setToast(false)} message="Profile updated" />
    </Stack>
  );
}
