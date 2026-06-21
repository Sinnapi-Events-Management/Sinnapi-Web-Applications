import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useApplication } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';

export function useApplicationDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data: application, isLoading, error } = useApplication(id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['application', id] });
    qc.invalidateQueries({ queryKey: ['applications'] });
  }

  async function transition(to: string) {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('transition_application_status', {
      p_application_id: id,
      p_to: to,
      p_reason: null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    refresh();
  }

  async function approve() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('approve_vendor', { p_application_id: id });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    refresh();
    navigate('/vendors');
  }

  async function reject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const reason = String(new FormData(e.currentTarget).get('reason'));
    const { error } = await supabase.rpc('reject_vendor', {
      p_application_id: id,
      p_reason: reason,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRejectOpen(false);
    refresh();
  }

  return {
    application,
    isLoading,
    error,
    has,
    busy,
    err,
    rejectOpen,
    setRejectOpen,
    transition,
    approve,
    reject,
  };
}
