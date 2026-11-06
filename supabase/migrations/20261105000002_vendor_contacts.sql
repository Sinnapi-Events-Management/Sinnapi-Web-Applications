-- =====================================================================
-- Sinnapi — 1105b Vendor contacts: the vendor's own external clients
--
-- People a vendor invoices who have no Sinnapi account (or none the vendor
-- has dealt with on Sinnapi). Saved automatically the first time a
-- document is issued to them (`source = 'auto'`), or added by hand from the
-- Saved clients tab (`source = 'manual'`).
--
-- A contact is NOT an account: nothing here creates a profile, and nothing
-- looks a contact up against `profiles`, so a vendor can never learn from
-- this table whether an email address belongs to a Sinnapi user.
--
-- Deleting a contact is a soft delete (`tg_soft_delete`). Documents already
-- issued keep their own frozen copy of the recipient's details — they are
-- financial records (confirmed 2026-11-05).
-- =====================================================================

create table if not exists public.vendor_contacts (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendors(id),
  full_name    text not null,
  company_name text,
  email        citext,
  phone        text,
  address      text,
  notes        text,
  source       public.vendor_contact_source not null default 'manual',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id),
  updated_by   uuid references public.profiles(id),
  deleted_at   timestamptz,
  deleted_by   uuid references public.profiles(id),
  version      integer not null default 1,

  constraint ck_vendor_contacts_name    check (char_length(btrim(full_name)) between 1 and 200),
  constraint ck_vendor_contacts_company check (company_name is null or char_length(company_name) <= 200),
  constraint ck_vendor_contacts_email   check (email is null or (char_length(email) <= 254
                                               and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  constraint ck_vendor_contacts_phone   check (phone is null or char_length(phone) <= 40),
  constraint ck_vendor_contacts_address check (address is null or char_length(address) <= 500),
  constraint ck_vendor_contacts_notes   check (notes is null or char_length(notes) <= 1000)
);

comment on table public.vendor_contacts is
  'A vendor''s saved external clients (no Sinnapi account needed). Owned by one vendor; never linked to profiles.';

-- One live contact per email per vendor, so auto-save can match a returning
-- client instead of piling up duplicates. citext makes it case-insensitive.
create unique index if not exists ux_vendor_contacts_email
  on public.vendor_contacts (vendor_id, email)
  where email is not null and deleted_at is null;

create index if not exists ix_vendor_contacts_vendor_name
  on public.vendor_contacts (vendor_id, lower(full_name))
  where deleted_at is null;

-- The generic triggers from 0010 were installed by introspecting the tables
-- that existed then, so a table added later carries its own copies.
drop trigger if exists trg_updated_at on public.vendor_contacts;
create trigger trg_updated_at before update on public.vendor_contacts
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_bump_version on public.vendor_contacts;
create trigger trg_bump_version before update on public.vendor_contacts
  for each row execute function public.tg_bump_version();

drop trigger if exists trg_audit_actor on public.vendor_contacts;
create trigger trg_audit_actor before insert or update on public.vendor_contacts
  for each row execute function public.tg_set_audit_actor();

drop trigger if exists trg_soft_delete on public.vendor_contacts;
create trigger trg_soft_delete before delete on public.vendor_contacts
  for each row execute function public.tg_soft_delete();

drop trigger if exists trg_audit_log on public.vendor_contacts;
create trigger trg_audit_log after insert or update or delete on public.vendor_contacts
  for each row execute function public.tg_write_audit();

-- A contact cannot move between vendors.
create or replace function public.tg_vendor_contact_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.vendor_id is distinct from old.vendor_id then
    raise exception 'contact_vendor_immutable' using errcode = 'P0001';
  end if;
  return new;
end;$$;

drop trigger if exists trg_vendor_contact_guard on public.vendor_contacts;
create trigger trg_vendor_contact_guard before update on public.vendor_contacts
  for each row execute function public.tg_vendor_contact_guard();
