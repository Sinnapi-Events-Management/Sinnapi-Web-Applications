-- =====================================================================
-- Sinnapi — anonymous applicants can upload their verification documents again
--
-- `20261022000002_public_vendor_application_documents.sql` rebuilt the
-- `intake_upload` policy to enforce the 10 MB / PDF-PNG-JPEG document limits
-- from `storage.objects.metadata`. Every upload into `national-id/` and
-- `business-registration/` has 403'd since:
--
--   statusCode 403  error "Unauthorized"  code "AccessDenied"
--   "new row violates row-level security policy"
--
-- The reason is the order storage-api works in. It authorises an upload BEFORE
-- it has the file: it opens a transaction as the caller's role, inserts the
-- object row to let RLS rule on it, rolls that back, streams the bytes to S3,
-- and only then writes the real row. At the moment the WITH CHECK runs there is
-- no `metadata` yet — the column is populated by the storage service from the
-- completed upload (size, mimetype, eTag, …), so it is NULL in the check. Then
-- `metadata->>'mimetype' in (...)` is NULL rather than true, the check fails,
-- and the upload is refused before it is even attempted.
--
-- Nor could the applicant supply it: the browser's `metadata` upload option is
-- sent as `x-metadata` and lands in `user_metadata`, a different column, and it
-- is caller-controlled — a value a spammer can simply type. It is not something
-- to grant an upload on.
--
-- So size and mime type are not enforceable here, and they do not need to be.
-- They are enforced where the facts are actually known:
--   • the bucket — `file_size_limit` and `allowed_mime_types` on
--     `application-intake` (set in `20260702000001`), which storage checks
--     against the request itself;
--   • the `vendor-application` Edge Function — `requireUploadedDocument()`
--     reads each submitted path back with the service role and refuses the
--     application (422) unless the STORED object is a PDF/PNG/JPEG of 1 byte to
--     10 MB. That runs after the upload, on storage's own metadata, so it is
--     the only check that sees the truth. An oversized file that slips past the
--     bucket limit therefore buys an orphaned object in a private bucket and a
--     rejected application, not an intake row.
--
-- What this policy can see at check time is the object's name. So the two
-- document folders keep the one restriction that is evaluable: an allowed
-- document extension, mirroring `isIntakeDocumentPath()` in the Edge Function.
-- Other folders in the bucket (portfolio media) stay as permissive as they were
-- before `20261022000002`.
-- =====================================================================

drop policy if exists intake_upload on storage.objects;
create policy intake_upload on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'application-intake'
    and case
      when (storage.foldername(name))[2] in ('national-id', 'business-registration') then
        storage.filename(name) ~* '^[A-Za-z0-9_.-]+\.(pdf|png|jpe?g)$'
      else true
    end
  );

comment on policy intake_upload on storage.objects is
  'Anonymous applicants upload application files. Verification-document folders accept only PDF/PNG/JPEG names; size and mime type are enforced by the bucket limits and re-verified from stored metadata by the vendor-application function.';
