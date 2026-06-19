import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, TextField, Button, IconButton, Typography, Box, Alert, Divider } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatMoney } from '@/lib/config';
import { supabase } from '@/lib/supabase';

type Item = { description: string; quantity: number; unit_price: number };

// Builds quotation line items and sends them via the send_quotation RPC.
export default function QuotationBuilder({
  quotationId,
  currency = 'UGX',
}: {
  quotationId: string;
  currency?: string;
}) {
  const qc = useQueryClient();
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, unit_price: 0 }]);
  const [validDays, setValidDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = items.reduce((s, it) => s + (it.quantity || 0) * (it.unit_price || 0), 0);

  function update(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function send() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('send_quotation', {
      p_quotation_id: quotationId,
      p_items: items.filter((it) => it.description.trim()),
      p_valid_days: validDays,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-quotation', quotationId] });
    qc.invalidateQueries({ queryKey: ['v-quotations'] });
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {items.map((it, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <TextField
            label="Description"
            value={it.description}
            onChange={(e) => update(i, { description: e.target.value })}
            sx={{ flex: 3 }}
          />
          <TextField
            label="Qty"
            type="number"
            value={it.quantity}
            onChange={(e) => update(i, { quantity: Number(e.target.value) })}
            sx={{ flex: 1 }}
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Unit price"
            type="number"
            value={it.unit_price}
            onChange={(e) => update(i, { unit_price: Number(e.target.value) })}
            sx={{ flex: 1.5 }}
            inputProps={{ min: 0 }}
          />
          <IconButton
            aria-label="Remove"
            onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
            disabled={items.length === 1}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      ))}
      <Button
        startIcon={<AddIcon />}
        onClick={() => setItems((p) => [...p, { description: '', quantity: 1, unit_price: 0 }])}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add line item
      </Button>
      <Divider />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          label="Valid for (days)"
          type="number"
          value={validDays}
          onChange={(e) => setValidDays(Number(e.target.value))}
          sx={{ width: 160 }}
          inputProps={{ min: 1 }}
        />
        <Typography variant="h6">Total: {formatMoney(total, currency)}</Typography>
      </Box>
      <Button variant="contained" disabled={busy} onClick={send} sx={{ alignSelf: 'flex-end' }}>
        {busy ? 'Sending…' : 'Send quote'}
      </Button>
    </Stack>
  );
}
