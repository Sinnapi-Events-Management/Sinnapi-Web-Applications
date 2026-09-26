-- =====================================================================
-- Sinnapi — Storage object policies: match on `owner_id`, not `owner`
--
-- Fixes: "new row violates row-level security policy for table objects"
-- for every account whose `auth.users.id` is not an RFC-4122 UUID.
--
-- `20260618000013_storage.sql` wrote every object policy against
-- `storage.objects.owner`. That column is deprecated: storage-api now
-- records the uploader in `owner_id` (text, always the raw JWT `sub`) and
-- only mirrors it into the legacy `owner` (uuid) column when the value
-- passes an RFC-4122 validity check — version nibble 1-8, variant nibble
-- 8/9/a/b.
--
-- The 2026-09-06 legacy import (`supabase/migration-legacy/01_staging.sql`)
-- minted ids for the twelve accounts that arrived with base62 ids as
-- `md5('sinnapi-legacy-2026-09-06:' || legacy_user_id)::uuid`. Postgres
-- accepts an md5 digest as a `uuid`, but the digest's version and variant
-- nibbles are random hex, so ~7 in 8 of those ids are not RFC-4122 valid.
-- For those users storage-api leaves `owner` NULL, `owner = auth.uid()`
-- evaluates to NULL, the WITH CHECK fails, and EVERY upload they attempt is
-- refused. In the onboarding wizard that is an unrecoverable lockout: the
-- photo step has no "skip" and `OnboardingGate` admits nothing else.
--
-- The ids cannot be rewritten — they are foreign-keyed across the whole
-- schema and baked into live sessions — so the policies move to `owner_id`,
-- which is populated for every authenticated upload regardless of id shape.
-- `coalesce(owner::text, owner_id)` keeps every pre-existing object matching
-- exactly as it did before, so this is additive: nothing that passed before
-- stops passing.
--
-- Compared as TEXT deliberately: `owner_id` is a text column that is empty
-- for anonymous uploads, and casting it to uuid would throw inside the
-- policy rather than simply failing the check.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PUBLIC-MEDIA — profile photos, covers, package covers, portfolio images
-- ---------------------------------------------------------------------
drop policy if exists pubmedia_write on storage.objects;
create policy pubmedia_write on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media'
              and coalesce(owner::text, owner_id) = (select auth.uid()::text));

drop policy if exists pubmedia_modify on storage.objects;
create policy pubmedia_modify on storage.objects for update to authenticated
  using (bucket_id = 'public-media'
         and coalesce(owner::text, owner_id) = (select auth.uid()::text));

drop policy if exists pubmedia_delete on storage.objects;
create policy pubmedia_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-media'
         and (coalesce(owner::text, owner_id) = (select auth.uid()::text)
              or public.is_admin()));

-- ---------------------------------------------------------------------
-- VENDOR-VIDEOS — portfolio video
-- ---------------------------------------------------------------------
drop policy if exists vid_write on storage.objects;
create policy vid_write on storage.objects for insert to authenticated
  with check (bucket_id = 'vendor-videos'
              and coalesce(owner::text, owner_id) = (select auth.uid()::text));

drop policy if exists vid_modify on storage.objects;
create policy vid_modify on storage.objects for update to authenticated
  using (bucket_id = 'vendor-videos'
         and coalesce(owner::text, owner_id) = (select auth.uid()::text));

drop policy if exists vid_delete on storage.objects;
create policy vid_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vendor-videos'
         and (coalesce(owner::text, owner_id) = (select auth.uid()::text)
              or public.is_admin()));

-- ---------------------------------------------------------------------
-- VENDOR-PRIVATE — National ID / proof of work (onboarding step 5)
-- ---------------------------------------------------------------------
drop policy if exists vpriv_read on storage.objects;
create policy vpriv_read on storage.objects for select to authenticated
  using (bucket_id = 'vendor-private'
         and (coalesce(owner::text, owner_id) = (select auth.uid()::text)
              or public.has_permission('vendor.review')));

drop policy if exists vpriv_write on storage.objects;
create policy vpriv_write on storage.objects for insert to authenticated
  with check (bucket_id = 'vendor-private'
              and coalesce(owner::text, owner_id) = (select auth.uid()::text));

drop policy if exists vpriv_modify on storage.objects;
create policy vpriv_modify on storage.objects for update to authenticated
  using (bucket_id = 'vendor-private'
         and coalesce(owner::text, owner_id) = (select auth.uid()::text));

drop policy if exists vpriv_delete on storage.objects;
create policy vpriv_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vendor-private'
         and (coalesce(owner::text, owner_id) = (select auth.uid()::text)
              or public.has_permission('vendor.review')));

-- ---------------------------------------------------------------------
-- MOU-DOCUMENTS
-- ---------------------------------------------------------------------
drop policy if exists mou_read on storage.objects;
create policy mou_read on storage.objects for select to authenticated
  using (bucket_id = 'mou-documents'
         and (coalesce(owner::text, owner_id) = (select auth.uid()::text)
              or public.has_permission('vendor.review')));

drop policy if exists mou_write on storage.objects;
create policy mou_write on storage.objects for insert to authenticated
  with check (bucket_id = 'mou-documents'
              and (coalesce(owner::text, owner_id) = (select auth.uid()::text)
                   or public.has_permission('vendor.review')));

-- ---------------------------------------------------------------------
-- CHAT-ATTACHMENTS
-- ---------------------------------------------------------------------
drop policy if exists chat_read on storage.objects;
create policy chat_read on storage.objects for select to authenticated
  using (bucket_id = 'chat-attachments'
         and (coalesce(owner::text, owner_id) = (select auth.uid()::text)
              or public.has_permission('moderation.manage')));

drop policy if exists chat_write on storage.objects;
create policy chat_write on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-attachments'
              and coalesce(owner::text, owner_id) = (select auth.uid()::text));

-- ---------------------------------------------------------------------
-- DISPUTE-EVIDENCE
-- ---------------------------------------------------------------------
drop policy if exists disp_read on storage.objects;
create policy disp_read on storage.objects for select to authenticated
  using (bucket_id = 'dispute-evidence'
         and (coalesce(owner::text, owner_id) = (select auth.uid()::text)
              or public.has_permission('dispute.manage')));

drop policy if exists disp_write on storage.objects;
create policy disp_write on storage.objects for insert to authenticated
  with check (bucket_id = 'dispute-evidence'
              and coalesce(owner::text, owner_id) = (select auth.uid()::text));

-- ---------------------------------------------------------------------
-- REVIEW-MEDIA
-- ---------------------------------------------------------------------
drop policy if exists revmedia_write on storage.objects;
create policy revmedia_write on storage.objects for insert to authenticated
  with check (bucket_id = 'review-media'
              and coalesce(owner::text, owner_id) = (select auth.uid()::text));

-- ---------------------------------------------------------------------
-- EXPORTS — read only; the write side is permission-gated, not owner-gated
-- ---------------------------------------------------------------------
drop policy if exists exports_read on storage.objects;
create policy exports_read on storage.objects for select to authenticated
  using (bucket_id = 'exports'
         and (coalesce(owner::text, owner_id) = (select auth.uid()::text)
              or public.is_admin()));
