-- =====================================================================
-- Sinnapi — 0011 Row Level Security
-- Default-deny on every table. Policies enforce ownership + role/permission.
-- service_role (Edge Functions) bypasses RLS; SECURITY DEFINER RPCs/triggers
-- perform privileged writes. anon = public read of published content only.
-- =====================================================================

-- Helper: is a vendor publicly visible?
create or replace function public.vendor_is_public(p_vendor_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vendors v
    where v.id = p_vendor_id and v.status='active' and v.visibility='public' and v.deleted_at is null
  );
$$;

-- ---------- Enable RLS on every base table ----------
do $$
declare r record;
begin
  for r in select table_name from information_schema.tables
           where table_schema='public' and table_type='BASE TABLE'
  loop
    execute format('alter table public.%I enable row level security;', r.table_name);
    execute format('alter table public.%I force row level security;', r.table_name);
  end loop;
end$$;

-- =====================================================================
-- REFERENCE / LOOKUP  (public read, admin write)
-- =====================================================================
create policy ref_read_categories on public.service_categories for select to anon, authenticated using (true);
create policy ref_write_categories on public.service_categories for all to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy ref_read_regions on public.service_regions for select to anon, authenticated using (true);
create policy ref_write_regions on public.service_regions for all to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy ref_read_currencies on public.currencies for select to anon, authenticated using (true);
create policy ref_write_currencies on public.currencies for all to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy ref_read_fx on public.exchange_rates for select to anon, authenticated using (true);
-- inserts to FX are service_role only (no client policy)

create policy settings_read on public.platform_settings for select to authenticated using (true);
create policy settings_write on public.platform_settings for all to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

-- =====================================================================
-- IDENTITY & ACCESS
-- =====================================================================
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_permission('users.read') or public.is_admin());
create policy profiles_self_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_permission('users.manage'))
  with check (id = auth.uid() or public.has_permission('users.manage'));

create policy roles_read on public.roles for select to authenticated using (true);
create policy roles_write on public.roles for all to authenticated
  using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy perms_read on public.permissions for select to authenticated using (true);
create policy perms_write on public.permissions for all to authenticated
  using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy role_perms_read on public.role_permissions for select to authenticated using (true);
create policy role_perms_write on public.role_permissions for all to authenticated
  using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy user_roles_read on public.user_roles for select to authenticated
  using (profile_id = auth.uid() or public.has_permission('users.manage'));
create policy user_roles_write on public.user_roles for all to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));

-- =====================================================================
-- VENDOR DOMAIN
-- =====================================================================
-- Applications: applicant owns drafts; compliance manages all.
create policy app_read on public.vendor_applications for select to authenticated
  using (applicant_id = auth.uid() or public.has_permission('vendor.review'));
create policy app_insert on public.vendor_applications for insert to authenticated
  with check (applicant_id = auth.uid());
create policy app_update_owner on public.vendor_applications for update to authenticated
  using (applicant_id = auth.uid() and status in ('draft','pending_info'))
  with check (applicant_id = auth.uid());
create policy app_manage on public.vendor_applications for all to authenticated
  using (public.has_permission('vendor.review')) with check (public.has_permission('vendor.review'));

create policy app_hist_read on public.application_status_history for select to authenticated
  using (public.has_permission('vendor.review')
         or exists (select 1 from public.vendor_applications a
                    where a.id = application_id and a.applicant_id = auth.uid()));

-- Vendors: public read of visible; owner manage own; admin all.
create policy vendors_public_read on public.vendors for select to anon, authenticated
  using (status='active' and visibility='public' and deleted_at is null);
create policy vendors_owner_read on public.vendors for select to authenticated
  using (owner_id = auth.uid() or public.has_permission('vendor.manage'));
create policy vendors_owner_update on public.vendors for update to authenticated
  using (owner_id = auth.uid() or public.has_permission('vendor.manage'))
  with check (owner_id = auth.uid() or public.has_permission('vendor.manage'));
create policy vendors_admin_write on public.vendors for all to authenticated
  using (public.has_permission('vendor.manage')) with check (public.has_permission('vendor.manage'));

-- Vendor child tables: public read when parent public; owner manage.
create policy vsvc_read on public.vendor_services for select to anon, authenticated
  using (public.vendor_is_public(vendor_id) or public.is_vendor_owner(vendor_id) or public.has_permission('vendor.manage'));
create policy vsvc_write on public.vendor_services for all to authenticated
  using (public.is_vendor_owner(vendor_id)) with check (public.is_vendor_owner(vendor_id));

create policy vsr_read on public.vendor_service_regions for select to anon, authenticated
  using (public.vendor_is_public(vendor_id) or public.is_vendor_owner(vendor_id));
create policy vsr_write on public.vendor_service_regions for all to authenticated
  using (public.is_vendor_owner(vendor_id)) with check (public.is_vendor_owner(vendor_id));

create policy vmedia_read on public.vendor_media for select to anon, authenticated
  using (public.vendor_is_public(vendor_id) or public.is_vendor_owner(vendor_id) or public.has_permission('vendor.manage'));
create policy vmedia_write on public.vendor_media for all to authenticated
  using (public.is_vendor_owner(vendor_id)) with check (public.is_vendor_owner(vendor_id));

create policy vsocial_read on public.vendor_social_links for select to anon, authenticated
  using (public.vendor_is_public(vendor_id) or public.is_vendor_owner(vendor_id));
create policy vsocial_write on public.vendor_social_links for all to authenticated
  using (public.is_vendor_owner(vendor_id)) with check (public.is_vendor_owner(vendor_id));

-- Secure: bank accounts — owner + finance only (raw number is ciphertext; decrypt via RPC).
create policy bank_owner on public.vendor_bank_accounts for all to authenticated
  using (public.is_vendor_owner(vendor_id) or public.has_permission('payout.process'))
  with check (public.is_vendor_owner(vendor_id));

-- Secure: documents & references — owner + compliance only; never public.
create policy vdocs_rw on public.vendor_documents for all to authenticated
  using (public.has_permission('vendor.review')
         or (vendor_id is not null and public.is_vendor_owner(vendor_id))
         or (application_id is not null and exists
             (select 1 from public.vendor_applications a where a.id=application_id and a.applicant_id=auth.uid())))
  with check (true);

create policy vref_rw on public.vendor_references for all to authenticated
  using (public.has_permission('vendor.review')
         or (vendor_id is not null and public.is_vendor_owner(vendor_id))
         or (application_id is not null and exists
             (select 1 from public.vendor_applications a where a.id=application_id and a.applicant_id=auth.uid())))
  with check (true);

create policy vterms_read on public.vendor_terms_acceptances for select to authenticated
  using (public.has_permission('vendor.review')
         or (vendor_id is not null and public.is_vendor_owner(vendor_id))
         or (application_id is not null and exists
             (select 1 from public.vendor_applications a where a.id=application_id and a.applicant_id=auth.uid())));
create policy vterms_insert on public.vendor_terms_acceptances for insert to authenticated
  with check (application_id is not null and exists
             (select 1 from public.vendor_applications a where a.id=application_id and a.applicant_id=auth.uid()));

-- =====================================================================
-- SUBSCRIPTIONS & PLANS
-- =====================================================================
create policy plans_read on public.pricing_plans for select to anon, authenticated using (is_active or public.is_admin());
create policy plans_write on public.pricing_plans for all to authenticated
  using (public.has_permission('plans.manage')) with check (public.has_permission('plans.manage'));

create policy plan_feat_read on public.plan_features for select to anon, authenticated using (true);
create policy plan_feat_write on public.plan_features for all to authenticated
  using (public.has_permission('plans.manage')) with check (public.has_permission('plans.manage'));

create policy subs_read on public.subscriptions for select to authenticated
  using (public.is_vendor_owner(vendor_id) or public.has_permission('subscriptions.manage'));
create policy subs_manage on public.subscriptions for all to authenticated
  using (public.has_permission('subscriptions.manage')) with check (public.has_permission('subscriptions.manage'));

create policy sub_events_read on public.subscription_events for select to authenticated
  using (public.has_permission('subscriptions.manage')
         or exists (select 1 from public.subscriptions s
                    where s.id=subscription_id and public.is_vendor_owner(s.vendor_id)));

-- =====================================================================
-- EVENTS
-- =====================================================================
create policy events_public_read on public.events for select to anon, authenticated
  using ((status='published' and is_public and deleted_at is null) or posted_by = auth.uid() or public.is_admin());
create policy events_owner_write on public.events for all to authenticated
  using (posted_by = auth.uid() or public.has_permission('events.manage'))
  with check (posted_by = auth.uid() or public.has_permission('events.manage'));

create policy interests_read on public.event_interests for select to authenticated
  using (public.is_vendor_owner(vendor_id)
         or exists (select 1 from public.events e where e.id=event_id and e.posted_by=auth.uid())
         or public.is_admin());
create policy interests_write on public.event_interests for all to authenticated
  using (public.is_vendor_owner(vendor_id)) with check (public.is_approved_active_vendor(vendor_id));

-- =====================================================================
-- QUOTATIONS
-- =====================================================================
create policy qtpl_rw on public.quote_templates for all to authenticated
  using (public.is_vendor_owner(vendor_id)) with check (public.is_vendor_owner(vendor_id));
create policy qtpl_items_rw on public.quote_template_items for all to authenticated
  using (exists (select 1 from public.quote_templates t where t.id=template_id and public.is_vendor_owner(t.vendor_id)))
  with check (exists (select 1 from public.quote_templates t where t.id=template_id and public.is_vendor_owner(t.vendor_id)));

create policy quotations_read on public.quotations for select to authenticated
  using (client_id = auth.uid() or public.is_vendor_owner(vendor_id) or public.has_permission('quotations.read'));
create policy quotations_insert on public.quotations for insert to authenticated
  with check (client_id = auth.uid() or public.is_vendor_owner(vendor_id));
create policy quotations_update on public.quotations for update to authenticated
  using (client_id = auth.uid() or public.is_vendor_owner(vendor_id))
  with check (client_id = auth.uid() or public.is_vendor_owner(vendor_id));

create policy q_items_rw on public.quotation_items for all to authenticated
  using (exists (select 1 from public.quotations q where q.id=quotation_id
                 and (q.client_id=auth.uid() or public.is_vendor_owner(q.vendor_id))))
  with check (exists (select 1 from public.quotations q where q.id=quotation_id
                 and (q.client_id=auth.uid() or public.is_vendor_owner(q.vendor_id))));
create policy q_hist_read on public.quotation_status_history for select to authenticated
  using (exists (select 1 from public.quotations q where q.id=quotation_id
                 and (q.client_id=auth.uid() or public.is_vendor_owner(q.vendor_id) or public.has_permission('quotations.read'))));

-- =====================================================================
-- BOOKINGS & CALENDAR
-- =====================================================================
create policy bookings_read on public.bookings for select to authenticated
  using (client_id = auth.uid() or public.is_vendor_owner(vendor_id) or public.has_permission('bookings.read'));
create policy bookings_insert on public.bookings for insert to authenticated
  with check (client_id = auth.uid());
create policy bookings_update on public.bookings for update to authenticated
  using (client_id = auth.uid() or public.is_vendor_owner(vendor_id) or public.has_permission('bookings.manage'))
  with check (client_id = auth.uid() or public.is_vendor_owner(vendor_id) or public.has_permission('bookings.manage'));
create policy bsh_read on public.booking_status_history for select to authenticated
  using (exists (select 1 from public.bookings b where b.id=booking_id
                 and (b.client_id=auth.uid() or public.is_vendor_owner(b.vendor_id) or public.has_permission('bookings.read'))));

create policy avail_read on public.vendor_availability for select to anon, authenticated
  using (public.vendor_is_public(vendor_id) or public.is_vendor_owner(vendor_id));
create policy avail_write on public.vendor_availability for all to authenticated
  using (public.is_vendor_owner(vendor_id)) with check (public.is_vendor_owner(vendor_id));

create policy blocked_read on public.vendor_blocked_dates for select to anon, authenticated
  using (public.vendor_is_public(vendor_id) or public.is_vendor_owner(vendor_id));
create policy blocked_write on public.vendor_blocked_dates for all to authenticated
  using (public.is_vendor_owner(vendor_id) and source='manual')
  with check (public.is_vendor_owner(vendor_id) and source='manual');

-- =====================================================================
-- PAYMENTS / ESCROW / FINANCE
-- =====================================================================
create policy payments_read on public.payments for select to authenticated
  using (payer_id = auth.uid()
         or public.has_permission('payments.read')
         or (booking_id is not null and exists
             (select 1 from public.bookings b where b.id=booking_id and public.is_vendor_owner(b.vendor_id))));

create policy payment_logs_read on public.payment_logs for select to authenticated
  using (public.has_permission('payments.read'));

create policy escrow_read on public.escrow_transactions for select to authenticated
  using (client_id = auth.uid() or public.is_vendor_owner(vendor_id) or public.has_permission('escrow.read'));
create policy escrow_events_read on public.escrow_events for select to authenticated
  using (exists (select 1 from public.escrow_transactions e where e.id=escrow_id
                 and (e.client_id=auth.uid() or public.is_vendor_owner(e.vendor_id) or public.has_permission('escrow.read'))));

create policy payouts_read on public.payouts for select to authenticated
  using (public.is_vendor_owner(vendor_id) or public.has_permission('payout.approve') or public.has_permission('payout.process'));

create policy refunds_read on public.refunds for select to authenticated
  using (client_id = auth.uid() or public.has_permission('refund.approve'));

create policy disputes_read on public.disputes for select to authenticated
  using (raised_by = auth.uid() or against_id = auth.uid() or public.has_permission('dispute.manage'));
create policy disputes_insert on public.disputes for insert to authenticated
  with check (raised_by = auth.uid());
create policy disputes_manage on public.disputes for update to authenticated
  using (public.has_permission('dispute.manage')) with check (public.has_permission('dispute.manage'));

create policy dispute_ev_rw on public.dispute_evidence for all to authenticated
  using (exists (select 1 from public.disputes d where d.id=dispute_id
                 and (d.raised_by=auth.uid() or d.against_id=auth.uid() or public.has_permission('dispute.manage'))))
  with check (submitted_by = auth.uid() or public.has_permission('dispute.manage'));

create policy ledger_read on public.ledger_entries for select to authenticated
  using (public.has_permission('finance.read'));

-- =====================================================================
-- MESSAGING
-- =====================================================================
create policy convo_read on public.conversations for select to authenticated
  using (public.is_conversation_participant(id) or public.has_permission('moderation.manage'));
create policy convo_part_read on public.conversation_participants for select to authenticated
  using (profile_id = auth.uid() or public.is_conversation_participant(conversation_id) or public.has_permission('moderation.manage'));

create policy messages_read on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id) or public.has_permission('moderation.manage'));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));
create policy messages_update on public.messages for update to authenticated
  using (sender_id = auth.uid() or public.has_permission('moderation.manage'))
  with check (sender_id = auth.uid() or public.has_permission('moderation.manage'));

create policy msg_attach_rw on public.message_attachments for all to authenticated
  using (exists (select 1 from public.messages m where m.id=message_id and public.is_conversation_participant(m.conversation_id)))
  with check (exists (select 1 from public.messages m where m.id=message_id and public.is_conversation_participant(m.conversation_id)));

create policy msg_flags_rw on public.message_flags for all to authenticated
  using (flagged_by = auth.uid() or public.has_permission('moderation.manage'))
  with check (flagged_by = auth.uid() or public.has_permission('moderation.manage'));

-- =====================================================================
-- REVIEWS
-- =====================================================================
create policy reviews_public_read on public.reviews for select to anon, authenticated
  using ((status='published' and deleted_at is null) or client_id = auth.uid()
         or public.is_vendor_owner(vendor_id) or public.has_permission('moderation.manage'));
create policy reviews_insert on public.reviews for insert to authenticated
  with check (client_id = auth.uid());
create policy reviews_update on public.reviews for update to authenticated
  using (client_id = auth.uid() or public.has_permission('moderation.manage'))
  with check (client_id = auth.uid() or public.has_permission('moderation.manage'));

create policy review_resp_public_read on public.review_responses for select to anon, authenticated using (true);
create policy review_resp_write on public.review_responses for all to authenticated
  using (public.is_vendor_owner(vendor_id) or public.has_permission('moderation.manage'))
  with check (public.is_vendor_owner(vendor_id));

create policy review_reports_rw on public.review_reports for all to authenticated
  using (reported_by = auth.uid() or public.has_permission('moderation.manage'))
  with check (reported_by = auth.uid() or public.has_permission('moderation.manage'));

-- =====================================================================
-- PROMOTIONS & DISCOUNTS
-- =====================================================================
create policy promos_public_read on public.promotions for select to anon, authenticated
  using ((is_active and deleted_at is null) or public.is_vendor_owner(vendor_id));
create policy promos_write on public.promotions for all to authenticated
  using (public.is_vendor_owner(vendor_id)) with check (public.is_vendor_owner(vendor_id));

create policy discounts_read on public.discounts for select to authenticated
  using ((is_active and deleted_at is null)
         or (vendor_id is not null and public.is_vendor_owner(vendor_id))
         or public.is_admin());
create policy discounts_write on public.discounts for all to authenticated
  using ((vendor_id is not null and public.is_vendor_owner(vendor_id)) or public.has_permission('discounts.manage'))
  with check ((vendor_id is not null and public.is_vendor_owner(vendor_id)) or public.has_permission('discounts.manage'));

create policy redemptions_read on public.discount_redemptions for select to authenticated
  using (redeemed_by = auth.uid() or public.is_admin()
         or exists (select 1 from public.discounts d where d.id=discount_id and public.is_vendor_owner(d.vendor_id)));

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================
create policy notif_tpl_read on public.notification_templates for select to authenticated using (true);
create policy notif_tpl_write on public.notification_templates for all to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy notif_read on public.notifications for select to authenticated
  using (recipient_id = auth.uid() or public.is_admin());
create policy notif_update on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- =====================================================================
-- SYSTEM
-- =====================================================================
create policy audit_read on public.audit_logs for select to authenticated
  using (public.has_permission('audit.read'));

create policy login_hist_read on public.login_history for select to authenticated
  using (profile_id = auth.uid() or public.has_permission('audit.read'));

-- outbox: no client policies (service_role only) -> default deny.

create policy retention_read on public.data_retention_policies for select to authenticated
  using (public.has_permission('compliance.manage'));
create policy retention_write on public.data_retention_policies for all to authenticated
  using (public.has_permission('compliance.manage')) with check (public.has_permission('compliance.manage'));

create policy erasure_read on public.erasure_requests for select to authenticated
  using (profile_id = auth.uid() or public.has_permission('compliance.manage'));
create policy erasure_insert on public.erasure_requests for insert to authenticated
  with check (profile_id = auth.uid());
create policy erasure_manage on public.erasure_requests for update to authenticated
  using (public.has_permission('compliance.manage')) with check (public.has_permission('compliance.manage'));
