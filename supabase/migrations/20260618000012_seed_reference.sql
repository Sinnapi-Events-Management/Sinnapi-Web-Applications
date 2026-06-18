-- =====================================================================
-- Sinnapi — 0012 Seed: reference data, roles, permissions, plans, settings
-- Idempotent (ON CONFLICT). Safe to re-run.
-- =====================================================================

-- ---------- Currencies ----------
insert into public.currencies(code,name,symbol,minor_unit,is_active) values
  ('UGX','Ugandan Shilling','USh',0,true),
  ('USD','US Dollar','$',2,true)
on conflict (code) do nothing;

-- ---------- Service regions ----------
insert into public.service_regions(key,name,scope,sort_order) values
  ('kampala','Kampala','city',1),
  ('central','Central Uganda','region',2),
  ('eastern','Eastern Uganda','region',3),
  ('western','Western Uganda','region',4),
  ('northern','Northern Uganda','region',5),
  ('nationwide','Nationwide','national',6),
  ('east_africa','East Africa','continental',7),
  ('international','International','international',8)
on conflict (key) do nothing;

-- ---------- Service categories (top-level samples) ----------
insert into public.service_categories(key,name,sort_order) values
  ('photographer','Photographer',1),
  ('videographer','Videographer',2),
  ('decorator','Decorator',3),
  ('caterer','Caterer',4),
  ('makeup_artist','Makeup Artist',5),
  ('mc','MC',6),
  ('dj','DJ',7),
  ('venue','Venue',8),
  ('florist','Florist',9),
  ('security','Security Company',10),
  ('entertainment','Entertainment Provider',11),
  ('equipment','Event Equipment Supplier',12)
on conflict (key) do nothing;

-- ---------- Roles ----------
insert into public.roles(key,name,description,is_admin,is_system) values
  ('client','Client','Individual planning personal events',false,true),
  ('event_planner','Event Planner','Professional planner managing multiple events',false,true),
  ('vendor','Vendor','Service provider',false,true),
  ('super_admin','Super Admin','Full platform control + permission management',true,true),
  ('compliance','Compliance','Vendor approvals, due diligence, audit, retention',true,true),
  ('finance','Finance','Escrow, payouts, refunds, payments, ledger',true,true),
  ('support','Support / Moderator','Moderation, messaging, content oversight',true,true)
on conflict (key) do nothing;

-- ---------- Permissions ----------
insert into public.permissions(key,category,description) values
  ('users.read','users','View users'),
  ('users.manage','users','Manage users'),
  ('roles.manage','rbac','Manage roles & permissions'),
  ('vendor.review','vendor','Review vendor applications / due diligence'),
  ('vendor.approve','vendor','Approve / reject vendors'),
  ('vendor.manage','vendor','Manage vendor records'),
  ('subscriptions.manage','subscription','Manage subscriptions'),
  ('plans.manage','subscription','Manage pricing plans'),
  ('escrow.read','finance','View escrow transactions'),
  ('escrow.release','finance','Approve escrow release'),
  ('payout.approve','finance','Approve payouts'),
  ('payout.process','finance','Process payouts / access bank data'),
  ('refund.approve','finance','Approve refunds'),
  ('dispute.manage','finance','Adjudicate disputes'),
  ('payments.read','finance','View payments & PSP logs'),
  ('finance.read','finance','View ledger'),
  ('bookings.read','operations','View bookings'),
  ('bookings.manage','operations','Manage bookings'),
  ('quotations.read','operations','View quotations'),
  ('events.manage','operations','Post / manage events'),
  ('moderation.manage','moderation','Moderate messages & reviews'),
  ('discounts.manage','operations','Manage platform discounts'),
  ('settings.manage','system','Manage platform settings & reference data'),
  ('audit.read','system','View audit logs'),
  ('compliance.manage','system','Manage retention & erasure')
on conflict (key) do nothing;

-- ---------- Role → permission mapping ----------
-- Super Admin: everything
insert into public.role_permissions(role_id,permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.key='super_admin'
on conflict do nothing;

-- Compliance
insert into public.role_permissions(role_id,permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.key in ('users.read','vendor.review','vendor.approve','vendor.manage',
               'audit.read','compliance.manage','dispute.manage','moderation.manage')
where r.key='compliance'
on conflict do nothing;

-- Finance
insert into public.role_permissions(role_id,permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.key in ('escrow.read','escrow.release','payout.approve','payout.process',
               'refund.approve','dispute.manage','payments.read','finance.read',
               'subscriptions.manage')
where r.key='finance'
on conflict do nothing;

-- Support / Moderator
insert into public.role_permissions(role_id,permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.key in ('moderation.manage','bookings.read','quotations.read','events.manage','users.read')
where r.key='support'
on conflict do nothing;

-- ---------- Pricing plans (monthly; prices admin-editable) ----------
insert into public.pricing_plans(key,name,description,price,currency,billing_cycle,trial_days,sort_order) values
  ('starter','Starter','Get listed and start receiving leads',0,'UGX','monthly',30,1),
  ('professional','Professional','Most popular — visibility + analytics',0,'UGX','monthly',30,2),
  ('elite','Elite','Top placement + dedicated support',0,'UGX','monthly',30,3)
on conflict (key,billing_cycle) do nothing;

-- ---------- Plan features ----------
insert into public.plan_features(plan_id,feature_key,value)
select p.id, f.feature_key, f.value::jsonb
from public.pricing_plans p
join (values
  ('starter','verified_badge','true'),
  ('starter','max_portfolio_images','10'),
  ('starter','portfolio_video','false'),
  ('starter','search_placement','"standard"'),
  ('starter','client_analytics','false'),
  ('starter','homepage_featured','false'),
  ('starter','account_manager','false'),
  ('professional','verified_badge','true'),
  ('professional','max_portfolio_images','-1'),
  ('professional','portfolio_video','true'),
  ('professional','search_placement','"priority"'),
  ('professional','client_analytics','true'),
  ('professional','homepage_featured','false'),
  ('professional','account_manager','false'),
  ('elite','verified_badge','true'),
  ('elite','max_portfolio_images','-1'),
  ('elite','portfolio_video','true'),
  ('elite','search_placement','"top_tier"'),
  ('elite','client_analytics','true'),
  ('elite','homepage_featured','true'),
  ('elite','account_manager','true')
) as f(plan_key,feature_key,value) on f.plan_key = p.key::text
on conflict (plan_id,feature_key) do nothing;

-- ---------- Platform settings ----------
insert into public.platform_settings(key,value,data_type,description) values
  ('commission_rate', '10'::jsonb, 'number', 'Escrow commission percentage (admin-editable)'),
  ('subscription_grace_hours', '24'::jsonb, 'number', 'Grace period after subscription expiry'),
  ('quote_expiry_days', '14'::jsonb, 'number', 'Default quotation validity window'),
  ('default_currency', '"UGX"'::jsonb, 'string', 'Default platform currency'),
  ('trial_days', '30'::jsonb, 'number', 'Vendor free-trial length after approval'),
  ('fx_provider', '"openexchangerates"'::jsonb, 'string', 'Realtime FX rate source'),
  ('maintenance_mode', 'false'::jsonb, 'boolean', 'Global maintenance toggle')
on conflict (key) do nothing;

-- ---------- Data retention policy defaults (GDPR/DPPA; configurable) ----------
insert into public.data_retention_policies(data_category,retention_period,action_on_expiry,legal_hold,description) values
  ('identity_docs', interval '7 years', 'anonymize', true,  'National IDs — financial/KYC hold'),
  ('banking', interval '7 years', 'anonymize', true, 'Bank details — financial hold'),
  ('verification_docs', interval '7 years', 'archive', true, 'Proof of work / business reg'),
  ('messages', interval '2 years', 'delete', false, 'Chat messages'),
  ('bookings', interval '7 years', 'archive', true, 'Booking records — financial'),
  ('quotations', interval '3 years', 'delete', false, 'Quotations'),
  ('escrow', interval '10 years', 'retain', true, 'Escrow transactions — financial/legal'),
  ('subscriptions', interval '7 years', 'archive', true, 'Subscription records'),
  ('audit_logs', interval '7 years', 'retain', true, 'Audit trail — legal hold'),
  ('login_history', interval '1 year', 'delete', false, 'Login/device history'),
  ('media', interval '2 years', 'delete', false, 'Uploaded media for closed accounts'),
  ('notifications', interval '6 months', 'delete', false, 'In-app notifications')
on conflict (data_category) do nothing;
