import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBlockedDates } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useCalendar(vendorId: string) {
  const qc = useQueryClient();
  const blocked = useBlockedDates(vendorId);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function block(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('vendor_blocked_dates').insert({
      vendor_id: vendorId,
      blocked_date: date,
      reason: reason || null,
      source: 'manual',
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDate('');
    setReason('');
    qc.invalidateQueries({ queryKey: ['v-blocked', vendorId] });
  }

  async function unblock(id: string) {
    await supabase.from('vendor_blocked_dates').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['v-blocked', vendorId] });
  }

  const rows = blocked.data ?? [];

  return { blocked, rows, date, setDate, reason, setReason, busy, err, block, unblock };
}
