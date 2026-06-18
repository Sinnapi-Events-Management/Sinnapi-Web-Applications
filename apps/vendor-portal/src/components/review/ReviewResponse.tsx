import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Stack, TextField, Button, Alert, Box, Typography } from "@mui/material";
import { supabase } from "@/lib/supabase";

export default function ReviewResponse({ reviewId, existing }: { reviewId: string; existing?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(existing ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc("respond_to_review", { p_review_id: reviewId, p_body: value });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["v-reviews"] });
  }

  if (existing && !open) {
    return (
      <Box sx={{ mt: 1, pl: 2, borderLeft: 2, borderColor: "primary.light" }}>
        <Typography variant="caption" color="text.secondary">Your response</Typography>
        <Typography variant="body2">{existing}</Typography>
        <Button size="small" onClick={() => setOpen(true)} sx={{ mt: 0.5 }}>Edit response</Button>
      </Box>
    );
  }

  if (!open) return <Button size="small" onClick={() => setOpen(true)} sx={{ mt: 1 }}>Respond</Button>;

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField value={value} onChange={(e) => setValue(e.target.value)} placeholder="Write a response… (emoji welcome 🙂)" multiline minRows={2} />
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="contained" disabled={busy || !value.trim()} onClick={submit}>Save</Button>
        <Button size="small" onClick={() => setOpen(false)}>Cancel</Button>
      </Stack>
    </Stack>
  );
}
