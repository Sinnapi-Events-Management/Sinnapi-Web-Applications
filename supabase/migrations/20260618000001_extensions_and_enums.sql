-- =====================================================================
-- Sinnapi — 0001 Extensions & Enum Types
-- Single-tenant enterprise schema for Supabase / PostgreSQL.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;     -- gen_random_uuid(), crypto
create extension if not exists citext;       -- case-insensitive email
create extension if not exists pg_trgm;      -- fuzzy / search indexes
create extension if not exists btree_gin;    -- composite GIN indexes
-- NOTE: `pgsodium`/`vault` (field encryption for bank data) and `pg_cron`
-- (scheduled jobs) are enabled from the Supabase dashboard. Bank-account
-- numbers are stored as `bytea` (ciphertext) written via a SECURITY DEFINER
-- RPC using a Vault-managed key; raw values are never exposed to clients.

-- ---------- Identity / access ----------
create type profile_status        as enum ('active','suspended','pending');

-- ---------- Vendor onboarding ----------
create type years_in_operation    as enum ('lt_1y','1_3y','3_5y','5_10y','10y_plus');
create type pricing_model         as enum ('fixed','hourly','custom','combination');
create type lead_time             as enum ('same_week','1_2_weeks','2_4_weeks','1_3_months','3_plus_months');
create type application_status    as enum ('draft','submitted','under_review','pending_info',
                                           'due_diligence','mou_pending','mou_signed','approved','rejected');
create type vendor_status         as enum ('active','suspended','hidden');
create type vendor_visibility     as enum ('public','hidden');
create type media_type            as enum ('image','video');
create type document_type         as enum ('national_id','proof_of_work','mou','business_reg','other');
create type document_status       as enum ('pending','verified','rejected');
create type scan_status           as enum ('pending','clean','infected');
create type term_type             as enum ('info_accuracy','vendor_terms','escrow_policy','false_info_removal');
create type social_platform       as enum ('facebook','instagram','tiktok','linkedin','other');

-- ---------- Subscriptions ----------
create type plan_key              as enum ('starter','professional','elite');
create type billing_cycle         as enum ('monthly','annual');
create type subscription_status   as enum ('trialing','active','past_due','grace','suspended','expired','cancelled');
create type subscription_event    as enum ('created','trial_started','activated','renewed','payment_failed',
                                           'grace_entered','suspended','expired','reactivated','cancelled');

-- ---------- Events / discovery ----------
create type event_source          as enum ('admin','client');
create type event_status          as enum ('draft','published','closed','archived');
create type interest_status       as enum ('interested','shortlisted','declined','withdrawn');

-- ---------- Quotations ----------
create type quotation_status      as enum ('requested','draft','sent','accepted','declined','revised','expired');

-- ---------- Bookings / calendar ----------
create type booking_status        as enum ('requested','confirmed','in_progress','completed','cancelled','declined');
create type payment_type          as enum ('direct','escrow');
create type blocked_date_source   as enum ('manual','booking');

-- ---------- Payments / escrow ----------
create type payment_purpose       as enum ('booking_direct','escrow_funding','subscription');
create type payment_provider      as enum ('pesapal','paypal');
create type payment_method        as enum ('mtn_momo','airtel_money','card');
create type payment_status        as enum ('pending','processing','succeeded','failed','refunded','partially_refunded');
create type payment_log_direction as enum ('request','response','webhook');
create type escrow_status         as enum ('initiated','funded','held','release_requested','admin_review',
                                           'payout_approved','paid_out','disputed','refunded','partially_refunded','failed');
create type escrow_event_type     as enum ('initiated','funded','held','release_requested','admin_review',
                                           'payout_approved','paid_out','disputed','refund_requested',
                                           'refunded','partially_refunded','released','failed');
create type ledger_account        as enum ('client_funds','escrow_held','commission_revenue',
                                           'vendor_payable','psp_clearing','refund_payable');
create type ledger_direction      as enum ('debit','credit');
create type payout_status         as enum ('requested','approved','processing','completed','failed');
create type refund_type           as enum ('full','partial');
create type refund_status         as enum ('requested','approved','processing','completed','failed');
create type dispute_status        as enum ('open','under_review','awaiting_evidence',
                                           'resolved_refund','resolved_release','resolved_partial','closed');

-- ---------- Messaging ----------
create type conversation_type     as enum ('client_vendor','vendor_admin','client_admin');
create type conversation_status   as enum ('active','archived','blocked');
create type conversation_role     as enum ('client','vendor','admin');
create type message_moderation    as enum ('clean','flagged','blocked','pending');
create type moderation_reason     as enum ('profanity','scam','spam','abuse','off_platform','other');
create type moderation_status     as enum ('open','reviewed','actioned','dismissed');

-- ---------- Reviews ----------
create type review_status         as enum ('published','pending','hidden','removed');
create type review_moderation     as enum ('clean','flagged','removed');

-- ---------- Promotions / discounts ----------
create type discount_type         as enum ('percentage','fixed');

-- ---------- Notifications / system ----------
create type notification_channel  as enum ('in_app','email');
create type outbox_status         as enum ('pending','processing','processed','failed');
create type retention_action      as enum ('delete','anonymize','archive','retain');
create type erasure_status        as enum ('requested','reviewing','approved','partially_fulfilled','rejected','completed');
