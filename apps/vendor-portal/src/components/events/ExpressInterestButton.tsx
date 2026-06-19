import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Snackbar, Alert } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

// Inserts an event_interests row (RLS check: is_approved_active_vendor).
export default function ExpressInterestButton({
  eventId,
  vendorId,
  already,
}: {
  eventId: string;
  vendorId: string;
  already: boolean;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(already);

  async function express() {
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from('event_interests')
      .insert({ event_id: eventId, vendor_id: vendorId, status: 'interested' });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    qc.invalidateQueries({ queryKey: ['v-interests'] });
  }

  return (
    <>
      <Button
        size="small"
        variant={done ? 'outlined' : 'contained'}
        disabled={busy || done}
        onClick={express}
      >
        {done ? 'Interest sent' : 'Express interest'}
      </Button>
      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
