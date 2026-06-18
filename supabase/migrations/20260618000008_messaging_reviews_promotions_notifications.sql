-- =====================================================================
-- Sinnapi — 0008 Messaging, Reviews, Promotions/Discounts, Notifications
-- =====================================================================

-- ---------------------------------------------------------------------
-- MESSAGING
-- ---------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  type            conversation_type not null,
  subject         text,
  vendor_id       uuid references public.vendors(id) on delete set null,
  last_message_at timestamptz,
  status          conversation_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  deleted_at      timestamptz,
  deleted_by      uuid references public.profiles(id),
  version         integer not null default 1
);
create index ix_conversations_type on public.conversations(type);
create index ix_conversations_last on public.conversations(last_message_at desc);

create table public.conversation_participants (
  id             uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  role_in_convo  conversation_role not null,
  last_read_at   timestamptz,
  is_muted       boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (conversation_id, profile_id)
);
create index ix_convo_part_profile on public.conversation_participants(profile_id);

create table public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  sender_id         uuid not null references public.profiles(id),
  body              text,
  moderation_status message_moderation not null default 'pending',
  moderation_score  numeric(5,4),
  edited_at         timestamptz,
  is_system         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  deleted_by        uuid references public.profiles(id),
  version           integer not null default 1
);
create index ix_messages_convo  on public.messages(conversation_id, created_at);
create index ix_messages_sender on public.messages(sender_id);
create index ix_messages_mod    on public.messages(moderation_status);

create table public.message_attachments (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  file_name   text,
  mime_type   text,
  size_bytes  bigint,
  scan_status scan_status not null default 'pending',
  created_at  timestamptz not null default now()
);
create index ix_msg_attach_message on public.message_attachments(message_id);

create table public.message_flags (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  flagged_by  uuid references public.profiles(id),     -- null = system/auto
  reason      moderation_reason not null,
  status      moderation_status not null default 'open',
  reviewed_by uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index ix_msg_flags_message on public.message_flags(message_id);
create index ix_msg_flags_status  on public.message_flags(status);

-- ---------------------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------------------
create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  vendor_id         uuid not null references public.vendors(id) on delete cascade,
  client_id         uuid not null references public.profiles(id) on delete cascade,
  booking_id        uuid not null references public.bookings(id),
  rating            integer not null check (rating between 1 and 5),
  title             text,
  body              text,
  status            review_status not null default 'published',
  moderation_status review_moderation not null default 'clean',
  edited_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id),
  deleted_at        timestamptz,
  deleted_by        uuid references public.profiles(id),
  version           integer not null default 1
);
create unique index ux_reviews_booking on public.reviews(booking_id);  -- one review per completed booking
create index ix_reviews_vendor on public.reviews(vendor_id, status);
create index ix_reviews_client on public.reviews(client_id);

create table public.review_responses (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews(id) on delete cascade,
  vendor_id  uuid not null references public.vendors(id) on delete cascade,
  body       text not null,                 -- may contain emoji
  edited_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  version    integer not null default 1
);
create unique index ux_review_response on public.review_responses(review_id) where deleted_at is null;
create index ix_review_response_vendor on public.review_responses(vendor_id);

create table public.review_reports (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews(id) on delete cascade,
  reported_by uuid references public.profiles(id),
  reason      moderation_reason not null,
  status      moderation_status not null default 'open',
  reviewed_by uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index ix_review_reports_review on public.review_reports(review_id);
create index ix_review_reports_status on public.review_reports(status);

-- ---------------------------------------------------------------------
-- PROMOTIONS & DISCOUNTS
-- ---------------------------------------------------------------------
create table public.promotions (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references public.vendors(id) on delete cascade,
  title       text not null,
  description text,
  banner_url  text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id),
  updated_by  uuid references public.profiles(id),
  deleted_at  timestamptz,
  deleted_by  uuid references public.profiles(id),
  version     integer not null default 1,
  check (ends_at >= starts_at)
);
create index ix_promotions_vendor on public.promotions(vendor_id);
create index ix_promotions_window on public.promotions(starts_at, ends_at);

create table public.discounts (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid references public.vendors(id) on delete cascade,  -- null = platform-wide
  promotion_id uuid references public.promotions(id) on delete set null,
  code         text,
  type         discount_type not null,
  value        numeric(14,2) not null check (value >= 0),
  currency     text references public.currencies(code),
  max_uses     integer,
  used_count   integer not null default 0,
  min_amount   numeric(14,2),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id),
  updated_by   uuid references public.profiles(id),
  deleted_at   timestamptz,
  deleted_by   uuid references public.profiles(id),
  version      integer not null default 1,
  check (ends_at >= starts_at)
);
create unique index ux_discounts_code on public.discounts(code) where code is not null and deleted_at is null;
create index ix_discounts_vendor on public.discounts(vendor_id);

create table public.discount_redemptions (
  id             uuid primary key default gen_random_uuid(),
  discount_id    uuid not null references public.discounts(id) on delete cascade,
  booking_id     uuid references public.bookings(id) on delete set null,
  quotation_id   uuid references public.quotations(id) on delete set null,
  redeemed_by    uuid references public.profiles(id),
  amount_applied numeric(14,2) not null default 0,
  created_at     timestamptz not null default now(),
  unique (discount_id, booking_id)
);
create index ix_redemptions_discount on public.discount_redemptions(discount_id);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
create table public.notification_templates (
  id            uuid primary key default gen_random_uuid(),
  trigger_key   text not null,
  channel       notification_channel not null,
  subject       text,
  body_template text not null,
  locale        text not null default 'en',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles(id),
  version       integer not null default 1,
  unique (trigger_key, channel, locale)
);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  trigger_key  text not null,
  title        text not null,
  body         text,
  data         jsonb,
  channel      notification_channel not null default 'in_app',
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index ix_notifications_recipient on public.notifications(recipient_id, read_at);
create index ix_notifications_trigger   on public.notifications(trigger_key);
create index ix_notifications_created   on public.notifications(created_at);
