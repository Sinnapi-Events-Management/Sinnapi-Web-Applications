import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, Button, Alert } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

export default function BookingResponseActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['v-booking', bookingId] });
    qc.invalidateQueries({ queryKey: ['v-bookings'] });
    qc.invalidateQueries({ queryKey: ['v-dashboard'] });
  }

  async function respond(action: 'accept' | 'decline') {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('respond_booking', {
      p_booking_id: bookingId,
      p_action: action,
      p_reason: null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    refresh();
  }

  async function complete() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('complete_booking', { p_booking_id: bookingId });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    refresh();
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={1}>
        {status === 'requested' && (
          <>
            <Button variant="contained" disabled={busy} onClick={() => respond('accept')}>
              Accept
            </Button>
            <Button
              color="error"
              variant="outlined"
              disabled={busy}
              onClick={() => respond('decline')}
            >
              Decline
            </Button>
          </>
        )}
        {['confirmed', 'in_progress'].includes(status) && (
          <Button variant="contained" color="success" disabled={busy} onClick={complete}>
            Mark completed
          </Button>
        )}
      </Stack>
    </>
  );
}
