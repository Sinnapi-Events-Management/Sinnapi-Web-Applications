import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMessageFlags } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useMessagingModeration() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useMessageFlags();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ['message-flags'] });
  }

  async function blockMessage(messageId: string | undefined, flagId: string) {
    setBusy(flagId);
    setErr(null);
    const r1 = await supabase
      .from('messages')
      .update({ moderation_status: 'blocked' })
      .eq('id', messageId);
    const r2 = await supabase.from('message_flags').update({ status: 'actioned' }).eq('id', flagId);
    setBusy(null);
    if (r1.error || r2.error) {
      setErr((r1.error ?? r2.error)!.message);
      return;
    }
    refresh();
  }

  async function dismiss(flagId: string) {
    setBusy(flagId);
    setErr(null);
    const { error } = await supabase
      .from('message_flags')
      .update({ status: 'dismissed' })
      .eq('id', flagId);
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    refresh();
  }

  return {
    rows,
    isLoading,
    error,
    busy,
    err,
    blockMessage,
    dismiss,
  };
}
