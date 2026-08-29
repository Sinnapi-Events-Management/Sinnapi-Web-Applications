import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, CircularProgress, Snackbar } from '@sinnapi/ui';
import CheckIcon from '@mui/icons-material/Check';
import { supabase } from '@/lib/supabase';

type ExpressInterestButtonProps = {
  eventId: string;
  vendorId: string;
  /** Whether this vendor's interest is already on record. */
  already: boolean;
  fullWidth?: boolean;
};

/**
 * Registers a vendor's interest in a public event. Inserts an `event_interests`
 * row; the RLS check (`is_approved_active_vendor`) is what decides whether it
 * lands.
 *
 * "Already sent" is derived from `already || sent`, never copied into state on
 * mount. The previous version seeded a `done` flag from the prop and then never
 * looked at the prop again — but `already` comes from the interests query,
 * which on a cold cache resolves *after* the feed does. Every card therefore
 * painted "Express interest" and stayed that way, inviting a vendor to send an
 * interest they had already sent and watch it fail on the unique constraint.
 * `sent` now only ever records what happened in this component's own lifetime.
 */
export default function ExpressInterestButton({
  eventId,
  vendorId,
  already,
  fullWidth = false,
}: ExpressInterestButtonProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = already || sent;

  async function express() {
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase
      .from('event_interests')
      .insert({ event_id: eventId, vendor_id: vendorId, status: 'interested' });
    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSent(true);
    queryClient.invalidateQueries({ queryKey: ['v-interests'] });
  }

  return (
    <>
      <Button
        size="small"
        fullWidth={fullWidth}
        variant={done ? 'outlined' : 'contained'}
        disabled={busy || done}
        onClick={express}
        startIcon={
          busy ? <CircularProgress size={15} color="inherit" /> : done ? <CheckIcon /> : null
        }
        // A disabled button reports nothing about *why*. The sent state is a
        // success, not an unavailable control, so it says so out loud.
        aria-label={
          done ? 'Interest already sent for this event' : 'Express interest in this event'
        }
        sx={{ whiteSpace: 'nowrap' }}
      >
        {busy ? 'Sending…' : done ? 'Interest sent' : 'Express interest'}
      </Button>

      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
