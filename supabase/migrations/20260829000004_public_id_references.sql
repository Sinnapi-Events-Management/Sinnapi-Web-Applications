-- =====================================================================
-- Sinnapi — 0829d Public identifiers: quotations and bookings
--
-- These two tables already have a public identifier — `reference_no`,
-- currently `Q-7657H8YH` / `B-4B8ZTNQ2` from 20260807000002 — so they get
-- no `public_id` column. Giving a record two public identifiers would
-- mean support asking "which of your two references is that?", which is
-- worse than either format alone. Instead `reference_no` is migrated to
-- the platform-wide shape and stays the single identifier:
--
--     Q-7657H8YH   ->   SQ7657H8YH
--     B-4B8ZTNQ2   ->   SB4B8ZTNQ2
--
-- The eight characters are drawn afresh rather than transplanted: they
-- come from `mint_public_id`, so every reference is entered in the
-- registry and shares the one global namespace with `SV…`, `ST…` and the
-- rest. Reusing the old token would have left it unregistered and able to
-- collide with a future draw.
--
-- ---------------------------------------------------------------------
-- THE PAPER TRAIL IS KEPT, WHICH IS WHY THIS IS SAFE TO BACKFILL
-- 20260807000001 declined to rewrite existing references, and gave a good
-- reason: clients hold PDFs, emails and screenshots quoting them. That
-- reason is answered here rather than ignored. Every prior value is
-- preserved in `legacy_reference_no` and the admin lookup
-- (20260829000005) matches against it, so a client reading a number off a
-- year-old quotation PDF still finds their record. What changes is that
-- the platform now displays exactly one format instead of three.
--
-- Nothing else has to change, and this was verified rather than assumed:
-- there is no CHECK constraint on `reference_no`, no LIKE or regex
-- against it in any RPC or admin search, no length assumption, and every
-- frontend use across the four portals is display-only — table cells,
-- page headings, and the quotation PDF header.
--
-- ---------------------------------------------------------------------
-- WHY THE OLD TRIGGER IS REPLACED RATHER THAN AMENDED
-- `tg_assign_reference_no` (20260807000001) rejects any UPDATE that
-- changes `reference_no`. That guard is correct and is kept — but it also
-- means the backfill below cannot run while it is installed. The trigger
-- is therefore dropped, the rewrite performed, and the replacement
-- installed, all inside this migration's single transaction: there is no
-- moment at which a client-side UPDATE could slip through and choose its
-- own reference.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Preserve. `legacy_reference_no` is nullable forever: rows created
--    after this migration have no previous reference and a sentinel
--    would only be something for lookup to special-case.
-- ---------------------------------------------------------------------
alter table public.quotations add column if not exists legacy_reference_no text;
alter table public.bookings   add column if not exists legacy_reference_no text;

-- Naming the column explicitly keeps the trigger's `update of
-- reference_no` guard from firing — this statement does not touch it.
update public.quotations set legacy_reference_no = reference_no
  where legacy_reference_no is null and reference_no is not null;
update public.bookings   set legacy_reference_no = reference_no
  where legacy_reference_no is null and reference_no is not null;

-- Lookup path for a client quoting an old reference. Partial, because
-- every row created from now on leaves the column null and there is no
-- reason to index those.
create index if not exists ix_quotations_legacy_ref
  on public.quotations(legacy_reference_no) where legacy_reference_no is not null;
create index if not exists ix_bookings_legacy_ref
  on public.bookings(legacy_reference_no)   where legacy_reference_no is not null;

-- ---------------------------------------------------------------------
-- 2. Stand the immutability guard down for the length of the rewrite.
-- ---------------------------------------------------------------------
drop trigger if exists trg_reference_no on public.quotations;
drop trigger if exists trg_reference_no on public.bookings;

-- ---------------------------------------------------------------------
-- 3. Rewrite, row at a time — same reasoning as `install_public_id`:
--    every row of one UPDATE shares a snapshot, so a set-based rewrite
--    would lean on collision retry for every row rather than the rare
--    one.
-- ---------------------------------------------------------------------
do $$
declare
  v_spec  record;
  v_row   record;
  v_count int;
begin
  for v_spec in
    select * from (values ('quotations','SQ'), ('bookings','SB')) as t(tbl, prefix)
  loop
    v_count := 0;
    for v_row in execute format(
      'select id from public.%I where reference_no is null or reference_no !~ ''^[A-Z]{2}[0-9A-Z]{8}$'' order by id',
      v_spec.tbl
    )
    loop
      execute format('update public.%I set reference_no = $1 where id = $2', v_spec.tbl)
        using public.mint_public_id(v_spec.prefix, format('public.%s', v_spec.tbl), v_row.id),
              v_row.id;
      v_count := v_count + 1;
    end loop;
    raise notice 'reference_no: public.% (%) — % row(s) rewritten', v_spec.tbl, v_spec.prefix, v_count;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. The replacement assigner.
--
-- Same contract as before — overwrite on INSERT, reject on UPDATE — so
-- 20260807000001's reasoning about *where* a reference is assigned stands
-- untouched: RLS admits direct client inserts on both tables, and
-- `reference_no` being NOT NULL with no default would otherwise oblige
-- such an insert to choose its own. Only the source of the string
-- changes, from `gen_reference` to `mint_public_id`.
--
-- The retry loops in `request_quotation` and `create_booking` still catch
-- `ux_quotations_ref` / `ux_bookings_ref` and are left in place. They are
-- now belt to `mint_public_id`'s braces — the registry resolves a
-- collision before the insert is ever attempted — but a second guard on
-- the two highest-traffic write paths costs nothing and would be the
-- thing that saved a client's request if this trigger were ever pointed
-- at a table whose ids were not registry-backed.
-- ---------------------------------------------------------------------
create or replace function public.tg_assign_reference_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- Schema-qualified from the trigger variables, never
    -- `tg_relid::regclass::text` — see tg_assign_public_id (20260829000001)
    -- for why those two differ and why it matters here.
    new.reference_no := public.mint_public_id(
      tg_argv[0],
      tg_table_schema || '.' || tg_table_name,
      new.id
    );
    return new;
  end if;

  if new.reference_no is distinct from old.reference_no then
    raise exception 'reference_no is immutable (% -> %)', old.reference_no, new.reference_no
      using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function public.tg_assign_reference_no() is
  'BEFORE INSERT: assigns reference_no from mint_public_id(TG_ARGV[0], ...), ignoring any supplied value. BEFORE UPDATE OF reference_no: rejects changes.';

create trigger trg_reference_no
  before insert or update of reference_no on public.quotations
  for each row execute function public.tg_assign_reference_no('SQ');

create trigger trg_reference_no
  before insert or update of reference_no on public.bookings
  for each row execute function public.tg_assign_reference_no('SB');

comment on column public.quotations.reference_no is
  'Public quotation identifier, e.g. SQ7657H8YH. Unique, immutable, assigned by trigger. Never a join key.';
comment on column public.bookings.reference_no is
  'Public booking identifier, e.g. SB4B8ZTNQ2. Unique, immutable, assigned by trigger. Never a join key.';
comment on column public.quotations.legacy_reference_no is
  'The reference this quotation carried before 20260829000004, e.g. Q-7657H8YH or QT-20260806-139D1C. Lookup only, so references already in client hands keep resolving.';
comment on column public.bookings.legacy_reference_no is
  'The reference this booking carried before 20260829000004. Lookup only, so references already in client hands keep resolving.';

-- ---------------------------------------------------------------------
-- 5. `gen_reference` has no callers left.
--
-- Left in place rather than dropped: it is revoked from every client role
-- already, dropping it would break any migration replay that references
-- it, and a function nobody can execute is not a liability. The comment
-- is what stops the next reader wiring it back up.
-- ---------------------------------------------------------------------
comment on function public.gen_reference(text) is
  'SUPERSEDED by mint_public_id (20260829000001) — unregistered, so its output can collide with a registry-issued id. No callers. Do not use for new work.';
