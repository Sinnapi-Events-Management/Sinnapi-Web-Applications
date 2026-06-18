-- =====================================================================
-- Sinnapi — 0013 Storage Buckets & Object Policies
-- Private buckets are reachable only via short-lived signed URLs.
-- Path convention: first folder segment = owning entity id (vendor/user).
-- =====================================================================

-- ---------- Buckets ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media',    'public-media',    true,  10485760,  array['image/jpeg','image/png','image/webp','image/avif']),
  ('vendor-videos',   'vendor-videos',   true,  524288000, array['video/mp4','video/webm','video/quicktime']),
  ('vendor-private',  'vendor-private',  false, 20971520,  array['image/jpeg','image/png','application/pdf']),
  ('mou-documents',   'mou-documents',   false, 20971520,  array['application/pdf']),
  ('chat-attachments','chat-attachments',false, 26214400,  null),
  ('dispute-evidence','dispute-evidence',false, 26214400,  null),
  ('review-media',    'review-media',    true,  10485760,  array['image/jpeg','image/png','image/webp']),
  ('exports',         'exports',         false, 52428800,  null)
on conflict (id) do nothing;

-- Helper: first path segment of an object name (the owning entity id as text).
create or replace function public.storage_owner_segment(p_name text)
returns text language sql immutable as $$ select split_part(p_name, '/', 1); $$;

-- ---------------------------------------------------------------------
-- PUBLIC-MEDIA  (public read; owner writes their own folder)
-- ---------------------------------------------------------------------
create policy pubmedia_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');
create policy pubmedia_write on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and owner = auth.uid());
create policy pubmedia_modify on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and owner = auth.uid());
create policy pubmedia_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and (owner = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------
-- VENDOR-VIDEOS  (public read; owner writes; plan entitlement enforced
-- at upload via the vendor portal / add_vendor_media RPC)
-- ---------------------------------------------------------------------
create policy vid_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'vendor-videos');
create policy vid_write on storage.objects for insert to authenticated
  with check (bucket_id = 'vendor-videos' and owner = auth.uid());
create policy vid_modify on storage.objects for update to authenticated
  using (bucket_id = 'vendor-videos' and owner = auth.uid());
create policy vid_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vendor-videos' and (owner = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------
-- VENDOR-PRIVATE  (National ID, proof of work, business reg) — NEVER public
-- read: owner or Compliance; signed URLs only.
-- ---------------------------------------------------------------------
create policy vpriv_read on storage.objects for select to authenticated
  using (bucket_id = 'vendor-private' and (owner = auth.uid() or public.has_permission('vendor.review')));
create policy vpriv_write on storage.objects for insert to authenticated
  with check (bucket_id = 'vendor-private' and owner = auth.uid());
create policy vpriv_modify on storage.objects for update to authenticated
  using (bucket_id = 'vendor-private' and owner = auth.uid());
create policy vpriv_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vendor-private' and (owner = auth.uid() or public.has_permission('vendor.review')));

-- ---------------------------------------------------------------------
-- MOU-DOCUMENTS — owner or Compliance
-- ---------------------------------------------------------------------
create policy mou_read on storage.objects for select to authenticated
  using (bucket_id = 'mou-documents' and (owner = auth.uid() or public.has_permission('vendor.review')));
create policy mou_write on storage.objects for insert to authenticated
  with check (bucket_id = 'mou-documents' and (owner = auth.uid() or public.has_permission('vendor.review')));

-- ---------------------------------------------------------------------
-- CHAT-ATTACHMENTS — uploader or moderator (participant scoping enforced
-- in messaging RPC; attachments inherit conversation access in app layer)
-- ---------------------------------------------------------------------
create policy chat_read on storage.objects for select to authenticated
  using (bucket_id = 'chat-attachments' and (owner = auth.uid() or public.has_permission('moderation.manage')));
create policy chat_write on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-attachments' and owner = auth.uid());

-- ---------------------------------------------------------------------
-- DISPUTE-EVIDENCE — uploader or dispute managers
-- ---------------------------------------------------------------------
create policy disp_read on storage.objects for select to authenticated
  using (bucket_id = 'dispute-evidence' and (owner = auth.uid() or public.has_permission('dispute.manage')));
create policy disp_write on storage.objects for insert to authenticated
  with check (bucket_id = 'dispute-evidence' and owner = auth.uid());

-- ---------------------------------------------------------------------
-- REVIEW-MEDIA — public read; owner writes
-- ---------------------------------------------------------------------
create policy revmedia_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'review-media');
create policy revmedia_write on storage.objects for insert to authenticated
  with check (bucket_id = 'review-media' and owner = auth.uid());

-- ---------------------------------------------------------------------
-- EXPORTS — requesting admin only; auto-expire handled by lifecycle job
-- ---------------------------------------------------------------------
create policy exports_read on storage.objects for select to authenticated
  using (bucket_id = 'exports' and (owner = auth.uid() or public.is_admin()));
create policy exports_write on storage.objects for insert to authenticated
  with check (bucket_id = 'exports' and public.is_admin());
