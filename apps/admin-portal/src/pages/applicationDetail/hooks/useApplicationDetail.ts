import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useApplication } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import { docKindFromPath, type PreviewDoc } from '@/components/ui/documentPreview';

const INTAKE_BUCKET = 'application-intake';

// Detail + triage for a single vendor application intake. Approval/promotion
// (creating an auth user + vendor_applications row) is a service-role Edge
// Function shipped in Stage 2 — `promote()` is intentionally not wired yet.
export function useApplicationDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data: intake, isLoading, error } = useApplication(id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['intake', id] });
    qc.invalidateQueries({ queryKey: ['intake'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
  }

  async function setStatus(status: 'reviewing' | 'rejected', notes?: string) {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('set_intake_status', {
      p_intake_id: id,
      p_status: status,
      p_notes: notes ?? null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return false;
    }
    refresh();
    return true;
  }

  async function markReviewing() {
    await setStatus('reviewing');
  }

  async function reject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = String(new FormData(e.currentTarget).get('reason'));
    if (await setStatus('rejected', reason)) setRejectOpen(false);
  }

  // Approve & promote: creates the applicant's account + vendor_applications
  // row and the live vendor (via approve_vendor), all inside the service-role
  // Edge Function. On success, jump to the new vendor list.
  async function promote() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.functions.invoke('promote-intake', {
      body: { intakeId: id },
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    refresh();
    navigate('/vendors');
  }

  // Verification docs live in the PRIVATE `application-intake` bucket; mint a
  // short-lived signed URL on demand (readable only with `vendor.review`) and
  // preview it in-app instead of opening a new tab.
  async function openDoc(path: string | null, title: string) {
    if (!path) return;
    setErr(null);
    const kind = docKindFromPath(path);
    const fileName = path.split('/').pop() || title;
    // Open the dialog immediately in a loading state for snappy feedback.
    setPreview({ title, url: '', fileName, kind });
    setPreviewLoading(true);
    const { data, error } = await supabase.storage.from(INTAKE_BUCKET).createSignedUrl(path, 300);
    setPreviewLoading(false);
    if (error || !data?.signedUrl) {
      setErr(error?.message ?? 'Could not open document');
      setPreview(null);
      return;
    }
    setPreview({ title, url: data.signedUrl, fileName, kind });
  }

  function closePreview() {
    setPreview(null);
  }

  return {
    intake,
    isLoading,
    error,
    has,
    busy,
    err,
    rejectOpen,
    setRejectOpen,
    markReviewing,
    reject,
    promote,
    openDoc,
    preview,
    previewLoading,
    closePreview,
  };
}
