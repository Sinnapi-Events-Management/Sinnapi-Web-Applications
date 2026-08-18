import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FileUpload,
  InfoRow,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { PayoutModel, VendorRef } from '@/lib/types';
import { SETTLEMENT_METHODS, useSettlementForm } from '../../hooks/useSettlementForm';

type Props = {
  payout: PayoutModel | null;
  onClose: () => void;
};

const KIND_LABEL: Record<string, string> = {
  advance: 'Advance tranche',
  balance: 'Balance tranche',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

/**
 * Recording that money physically left Sinnapi.
 *
 * This is the maker step: it does not complete the payout or post the
 * settlement ledger. A second Finance admin has to approve, which is why the
 * dialog says so rather than reading like a final action.
 */
export default function RecordSettlementDialog({ payout, onClose }: Props) {
  const form = useSettlementForm(payout, onClose);
  const vendor = one<VendorRef>(payout?.vendors)?.business_name ?? '—';

  return (
    <Dialog open={!!payout} onClose={form.busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record settlement</DialogTitle>
      <DialogContent dividers>
        {payout && (
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <Box>
              <InfoRow label="Vendor" value={vendor} />
              <InfoRow label="Tranche" value={KIND_LABEL[payout.kind] ?? payout.kind} />
              <InfoRow
                label="Amount"
                value={<strong>{formatMoney(payout.amount, payout.currency)}</strong>}
              />
              <InfoRow label="Payout account" value={payout.destination_label} />
            </Box>

            <TextField
              select
              fullWidth
              label="How was it sent?"
              value={form.method}
              onChange={(e) => form.setMethod(e.target.value as typeof form.method)}
              disabled={form.busy}
            >
              {SETTLEMENT_METHODS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              required
              label="Transaction reference"
              placeholder="e.g. MP2608.1234.A56789"
              value={form.reference}
              onChange={(e) => form.setReference(e.target.value)}
              disabled={form.busy}
              helperText={form.methodHint}
            />

            <TextField
              fullWidth
              label="Destination (optional)"
              placeholder="Masked account or phone number as it appears on the receipt"
              value={form.destination}
              onChange={(e) => form.setDestination(e.target.value)}
              disabled={form.busy}
              helperText="Never enter a full account number — the stored one stays encrypted."
            />

            <FileUpload
              label="Proof of transfer"
              hint="Receipt, deposit slip, or a signed acknowledgement for cash. Required."
              accept="image/jpeg,image/png,image/webp,application/pdf"
              maxSizeMb={20}
              disabled={form.busy}
              value={
                form.proof
                  ? [
                      {
                        id: 'proof',
                        name: form.proof.name,
                        size: form.proof.size,
                        status: 'done' as const,
                      },
                    ]
                  : []
              }
              onSelect={form.selectProof}
              onRemove={form.clearProof}
            />

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => form.setNotes(e.target.value)}
              disabled={form.busy}
            />

            <Typography variant="caption" color="text.secondary">
              Recording this does not complete the payout. A different Finance admin must approve it
              before the ledger closes and the vendor is notified.
            </Typography>

            {form.error && <Alert severity="error">{form.error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={form.busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<ReceiptLongIcon />}
          onClick={form.submit}
          disabled={form.busy}
        >
          {form.busy ? 'Recording…' : 'Record settlement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
