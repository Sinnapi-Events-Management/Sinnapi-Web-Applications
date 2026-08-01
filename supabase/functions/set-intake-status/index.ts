// set-intake-status — user-invoked (admin with `vendor.review`). Replaces the
// admin portal's direct `set_intake_status` RPC call: it performs the same
// transition (submitted → reviewing → rejected) and then emails the applicant
// copy written for the status they just moved to.
//
// Why an Edge Function (not the RPC alone): sending mail needs SMTP credentials
// and an outbound network call, neither of which belongs in a SQL function, and
// the applicant has no account — so the existing in-app notification pipeline
// (`outbox` → notification-dispatch, keyed by profile id) cannot reach them.
//
// The transition itself still runs through `public.set_intake_status` invoked
// with the CALLER'S JWT, so authorization (`has_permission('vendor.review')`),
// status validation, and the `reviewed_by = auth.uid()` audit trail keep their
// single source of truth in the database. This function adds delivery, not
// policy — it never uses the service_role client, so a caller without
// `vendor.review` can do nothing here that they could not already do.
//
// Approval is NOT expressible here — it creates an auth user and lives in the
// `promote-intake` function, which owns its own approval email.
//
// Optional env:
//   PUBLIC_SITE_URL — base for the "apply again" CTA (defaults per _shared)
import { handler, json } from '../_shared/http.ts';
import { userClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { sendEmail } from '../_shared/email.ts';
import { intakeStatusEmail } from './emails.ts';

type Body = { intakeId?: string; status?: string; notes?: string | null };

const STATUSES = ['submitted', 'reviewing', 'rejected'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(v?: string | null): string | null {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
}

/** Map a plpgsql exception from the RPC onto the right HTTP status. */
function mapRpcError(message: string): HttpError {
  if (/forbidden/i.test(message)) return new HttpError(403, 'forbidden');
  if (/not_found/i.test(message)) return new HttpError(404, 'intake_not_found');
  if (/invalid_status/i.test(message)) return new HttpError(422, message);
  return new HttpError(400, message);
}

Deno.serve(
  handler(async (request) => {
    if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    await requireUser(request);
    const user = userClient(request);

    const b = (await request.json().catch(() => null)) as Body | null;
    if (!b) throw new HttpError(400, 'invalid_json');
    if (!b.intakeId || !UUID_RE.test(b.intakeId)) throw new HttpError(422, 'invalid:intakeId');
    if (!b.status || !STATUSES.includes(b.status)) throw new HttpError(422, 'invalid:status');
    const status = b.status;
    const notes = clean(b.notes);

    // --- Read the current row FIRST, as the caller: the `intake_read` policy
    // already requires `vendor.review`, so an unauthorized caller sees nothing
    // and we avoid touching the service_role client on their behalf. We need
    // the pre-transition status to decide whether this is a real change.
    const { data: before, error: readErr } = await user
      .from('vendor_application_intake')
      .select(
        'id, status, owner_email, owner_full_name, business_name, submission_ref, review_notes',
      )
      .eq('id', b.intakeId)
      .maybeSingle();
    if (readErr) throw new HttpError(400, readErr.message);
    if (!before) throw new HttpError(404, 'intake_not_found');

    // Approved intakes are terminal here — reopening one would leave the vendor,
    // subscription and application `promote-intake` created dangling.
    if (before.status === 'approved') throw new HttpError(409, 'intake_already_approved');

    // --- Apply the transition through the existing RPC, as the caller.
    const { error: rpcErr } = await user.rpc('set_intake_status', {
      p_intake_id: b.intakeId,
      p_status: status,
      p_notes: notes,
    });
    if (rpcErr) throw mapRpcError(rpcErr.message);

    // --- Only a genuine status change is worth an email. A reviewer re-saving
    // the same status (double-click, retry, notes-only edit) must not resend.
    if (before.status === status) {
      return json(request, { status, changed: false, emailSent: false, emailSkipped: 'unchanged' });
    }

    // The RPC keeps the previous notes when the caller sends none, so mirror
    // that rule to decide what the applicant is told.
    const reason = notes ?? clean(before.review_notes);

    const message = intakeStatusEmail(status, {
      ownerFullName: String(before.owner_full_name ?? ''),
      ownerEmail: String(before.owner_email ?? ''),
      businessName: String(before.business_name ?? ''),
      submissionRef: String(before.submission_ref ?? ''),
      reason,
    });

    // --- Best-effort delivery. The transition is already committed, so an SMTP
    // failure must not fail the request — the outcome is reported instead and
    // the admin portal surfaces it as a non-blocking warning.
    if (!message) {
      return json(request, {
        status,
        changed: true,
        emailSent: false,
        emailSkipped: 'no_template',
      });
    }
    const result = await sendEmail(message).catch((e) => ({
      sent: false,
      error: (e as Error).message,
    }));
    if (!result.sent) {
      console.error('[SET-INTAKE-STATUS] email not delivered:', result.error);
    }

    return json(request, {
      status,
      changed: true,
      emailSent: result.sent,
      ...(result.error && { emailWarning: result.error }),
    });
  }),
);
