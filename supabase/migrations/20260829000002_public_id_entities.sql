-- =====================================================================
-- Sinnapi — 0829b Public identifiers: entity tables
--
-- Installs `public_id` on every entity a person may quote, with the
-- prefix map below. `profiles` (20260829000003) and the two tables that
-- already carry a `reference_no` (20260829000004) are handled separately
-- because neither is a plain install.
--
-- THE PREFIX MAP, AND WHY THESE LETTERS
-- `S` is fixed and means Sinnapi. The second letter names the category.
-- Three of the sixteen could not have their obvious letter, and guessing
-- later at why they differ would be worse than recording it now:
--
--   payments        ST  `SP` belongs to the event planner, so payments
--                       take T for *transaction*.
--   escrow          SX  `SE` belongs to events. X is the conventional
--                       mark for funds held rather than moved.
--   promotions      SM  `SP` again taken; M for *marketing*, which is
--                       also the domain the admin portal files it under.
--   settlements     SG  `SS` belongs to subscriptions. G for the
--                       settlement's *grant* of held funds to a vendor.
--
-- The letters are not load-bearing. Uniqueness comes from the registry
-- (20260829000001), which is global across every prefix; the prefix
-- exists so a support agent can tell a payout from a payment on sight.
--
-- WHY THE APPLICATION IDENTIFIER IS ON `vendor_application_intake`
-- An applicant is emailed about their application before any vendor row
-- exists, and support fields questions about applications that were
-- rejected and so never became vendors. Without `SL` those conversations
-- have no identifier at all and fall back to the applicant's email.
--
-- The identifier goes on `vendor_application_intake` rather than on
-- `vendor_applications`, which is the table whose name suggests it. The
-- intake row is the one the applicant actually has: it is what the
-- "Become a vendor" form writes, what the approval and rejection emails
-- are about, and what the admin portal's `/applications/:id` reads —
-- verified, not assumed, in `useApplications`. `vendor_applications` is
-- the internal record `promote-intake` creates *after* a decision, has no
-- page of its own, and is never quoted to anybody, so an identifier on it
-- would be a column with no reader.
--
-- SCOPE — WHAT IS DELIBERATELY LEFT OUT
-- Rows nobody quotes get no identifier, because an id that appears
-- nowhere is a column to maintain for nothing: join tables
-- (`user_roles`, `role_permissions`, `vendor_service_regions`), append-only
-- history and event logs (`*_status_history`, `escrow_events`,
-- `payment_events`, `audit_logs`, `login_history`), reference data
-- (`service_categories`, `service_regions`, `currencies`), and the
-- messaging tables, whose conversations are addressed by participant and
-- never by identifier.
-- =====================================================================

do $$
declare
  -- {table, prefix}, grouped as the portals group them.
  v_map text[][] := array[
    -- identity / listing
    ['vendors',                   'SV'],
    ['vendor_application_intake', 'SL'],
    -- transactional
    ['events',               'SE'],
    ['payments',             'ST'],
    ['payouts',              'SO'],
    ['disputes',             'SD'],
    ['escrow_transactions',  'SX'],
    ['refunds',              'SR'],
    ['settlement_requests',  'SG'],
    -- admin-managed
    ['subscriptions',        'SS'],
    ['promotions',           'SM'],
    ['newsletter_campaigns', 'SN']
  ];
  i int;
begin
  for i in 1 .. array_length(v_map, 1) loop
    perform public.install_public_id(v_map[i][1], v_map[i][2]);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- READABILITY OF THE COLUMN ITSELF
--
-- These comments are what a future reader sees in the Supabase table
-- editor, and the one thing worth saying there is that the column is not
-- a key: nothing joins on it, and code reaching for a foreign key wants
-- `id`.
-- ---------------------------------------------------------------------
do $$
declare
  v_tables text[] := array[
    'vendors','vendor_application_intake','events','payments','payouts','disputes',
    'escrow_transactions','refunds','settlement_requests','subscriptions',
    'promotions','newsletter_campaigns'
  ];
  t text;
begin
  foreach t in array v_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format(
        'comment on column public.%I.public_id is %L',
        t,
        'Public identifier shown to users, e.g. SV285K7BV9. Unique, immutable, assigned by trigger. Display and lookup only — never a join key; use id.'
      );
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- EXPOSURE
--
-- `public_id` is readable wherever its row already is: every policy in
-- 20260618000011 grants at row level, not column level, so a client that
-- may see a payment may now also see `ST41903QWH`. That is the whole
-- point and needs no new grant.
--
-- What does need saying is that no policy anywhere admits a *write*: the
-- BEFORE UPDATE trigger rejects a change to the column regardless of who
-- holds UPDATE on the table, so the read-everywhere / write-nowhere shape
-- holds without a column privilege to maintain.
-- ---------------------------------------------------------------------
