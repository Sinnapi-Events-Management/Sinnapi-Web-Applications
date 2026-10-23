-- Store the private Certificate of Incorporation submitted by registered
-- businesses. Document files remain in application-intake; only their paths
-- are stored on an intake row.
alter table public.vendor_application_intake
  add column if not exists business_registration_document_path text;

comment on column public.vendor_application_intake.business_registration_document_path is
  'Private application-intake storage path for a registered business Certificate of Incorporation.';

-- The application-intake bucket also carries larger portfolio media. Keep its
-- bucket-wide limit intact, but enforce the registration document limits for
-- the dedicated document folders using uploaded object metadata.
drop policy if exists intake_upload on storage.objects;
create policy intake_upload on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'application-intake'
    and case
      when (storage.foldername(name))[2] in ('national-id', 'business-registration') then
        metadata->>'mimetype' in ('application/pdf', 'image/png', 'image/jpeg')
        and coalesce(metadata->>'size', '') ~ '^[0-9]+$'
        and (metadata->>'size')::bigint <= 10485760
      else true
    end
  );
