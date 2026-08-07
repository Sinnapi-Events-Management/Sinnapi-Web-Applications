import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useQueryClient } from '@tanstack/react-query';
import { useApplication } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import { invokeFunction } from '@/lib/functions';
import { docKindFromPath, type PreviewDoc } from '@/components/ui/documentPreview';

const INTAKE_BUCKET = 'application-intake';

type StatusResult = { emailSent?: boolean; emailWarning?: string };

// Detail + triage for a single vendor application intake. Both triage actions
// go through Edge Functions rather than the database directly: `set-intake-status`
// applies the transition (still via the `set_intake_status` RPC, as the caller)
// and emails the applicant copy matching the new status, and `promote-intake`
// creates the account + vendor and sends the approval email.
export function useApplicationDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data: intake, isLoading, error } = useApplication(id);

  useBreadcrumbTitle(intake?.business_name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Email delivery is best-effort on the server: the status change succeeds even
  // when SMTP does not, so that outcome is surfaced separately from `err`.
  const [notice, setNotice] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['intake', id] });
    qc.invalidateQueries({ queryKey: ['intake'] });
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
  }

  // Applies the transition and notifies the applicant by email, in one call.
  async function setStatus(status: 'reviewing' | 'rejected', notes?: string) {
    setBusy(true);
    setErr(null);
    setNotice(null);
    const { data, error } = await invokeFunction<StatusResult>('set-intake-status', {
      intakeId: id,
      status,
      notes: notes ?? null,
    });
    setBusy(false);
    if (error) {
      setErr(error);
      return false;
    }
    if (data?.emailWarning) {
      setNotice(`Status updated, but the applicant could not be emailed: ${data.emailWarning}`);
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
    setNotice(null);
    const { data, error } = await invokeFunction<StatusResult>('promote-intake', { intakeId: id });
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    refresh();
    // The welcome email carries the new vendor's one-time password, so a failed
    // send needs a follow-up. Stay on the page in that case — navigating to
    // /vendors would unmount the warning before it is read.
    if (data?.emailWarning) {
      setNotice(
        `Vendor created, but the welcome email could not be sent: ${data.emailWarning}. ` +
          'Reset their password from Users to re-issue credentials.',
      );
      return;
    }
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
    notice,
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
