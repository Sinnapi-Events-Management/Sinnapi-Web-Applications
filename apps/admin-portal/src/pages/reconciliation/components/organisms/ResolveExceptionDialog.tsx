import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InfoRow,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { ReconciliationExceptionModel } from '@/lib/types';
import type { ResolutionStatus } from '../../hooks/useReconciliation';

const OUTCOMES: Array<{ value: ResolutionStatus; label: string; hint: string }> = [
  {
    value: 'investigating',
    label: 'Still investigating',
    hint: 'Keeps the item open and records what you have found so far.',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    hint: 'The discrepancy has been corrected or explained. Say how.',
  },
  {
    value: 'ignored',
    label: 'Not an issue',
    hint: 'A known false positive. Say why, so the next person does not re-open it.',
  },
];

type Props = {
  exception: ReconciliationExceptionModel | null;
  busy: string | null;
  error: string | null;
  onResolve: (id: string, status: ResolutionStatus, notes: string) => void;
  onClose: () => void;
};

/**
 * Working one exception.
 *
 * Notes are mandatory for every outcome. An exception closed with no
 * explanation is worse than one left open — it looks handled while telling the
 * next auditor nothing about what actually happened to the money.
 */
export default function ResolveExceptionDialog({
  exception,
  busy,
  error,
  onResolve,
  onClose,
}: Props) {
  const [status, setStatus] = useState<ResolutionStatus>('investigating');
  const [notes, setNotes] = useState('');
  const isBusy = !!exception && busy === exception.id;
  const tooShort = notes.trim().length < 10;

  return (
    <Dialog open={!!exception} onClose={isBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Work reconciliation item</DialogTitle>
      <DialogContent dividers>
        {exception && (
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {exception.detail}
            </Typography>

            <div>
              <InfoRow label="Expected" value={formatMoney(exception.expected, 'UGX')} />
              <InfoRow label="Actual" value={formatMoney(exception.actual, 'UGX')} />
              <InfoRow label="First seen" value={formatDateTime(exception.first_seen_at)} />
              <InfoRow label="Occurrences" value={`${exception.occurrences}`} />
              {exception.escrow_id && (
                <InfoRow
                  label="Escrow"
                  value={exception.escrow_id}
                  mono
                  copyValue={exception.escrow_id}
                />
              )}
              {exception.payment_id && (
                <InfoRow
                  label="Payment"
                  value={exception.payment_id}
                  mono
                  copyValue={exception.payment_id}
                />
              )}
              {exception.payout_id && (
                <InfoRow
                  label="Payout"
                  value={exception.payout_id}
                  mono
                  copyValue={exception.payout_id}
                />
              )}
            </div>

            <TextField
              select
              fullWidth
              label="Outcome"
              value={status}
              onChange={(e) => setStatus(e.target.value as ResolutionStatus)}
              disabled={isBusy}
              helperText={OUTCOMES.find((o) => o.value === status)?.hint}
            >
              {OUTCOMES.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              required
              multiline
              minRows={3}
              label="What did you find?"
              placeholder="What you checked, what caused it, and what you did about it."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isBusy}
              error={notes.length > 0 && tooShort}
              helperText="Recorded against the item permanently — this is the audit trail."
            />

            <Alert severity="info">
              Nothing here moves money. If a correction is needed, make it through the normal
              payout, refund or adjustment flow so it posts to the ledger properly.
            </Alert>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={tooShort || isBusy || !exception}
          onClick={() => exception && onResolve(exception.id, status, notes)}
        >
          {isBusy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
