-- =====================================================================
-- Sinnapi — 0829a Public identifiers: generator, registry, installer
--
-- Every entity a human ever quotes — a vendor, a payment, a dispute —
-- gains a short, unguessable, category-prefixed public identifier:
--
--     SV285K7BV9
--     ^^ ^^^^^^^^
--     |  5 digits + 3 letters, shuffled (gen_reference_token)
--     |
--     S = Sinnapi, V = Vendor
--
-- WHY, GIVEN EVERY TABLE ALREADY HAS A UUID PRIMARY KEY
-- The UUID is a fine key and a poor identifier. `v4` is unguessable, so
-- the objection is not secrecy — it is that the platform was showing an
-- internal join key to end users (the vendor profile's "Vendor ID" read
-- `e0a9ef98-4808-4c5c-9c86-78b872c2ac6a`), which is 36 characters no one
-- can read over a phone, retype, or recognise as belonging to a vendor
-- rather than to a booking. It also welds a support-facing string to a
-- foreign-key target, so the identifier can never be reissued and the key
-- can never be repartitioned.
--
-- THE UUID IS NOT REPLACED. It stays the primary key and stays the target
-- of all 129 foreign keys into `profiles`, all 23 into `vendors`, and all
-- 346 `auth.uid()` comparisons in RLS. `profiles.id` in particular *is*
-- `auth.users.id` and is not the platform's to change. `public_id` is a
-- second, unique, immutable column that is the only identifier ever
-- rendered, copied or quoted. Nothing joins on it.
--
-- ---------------------------------------------------------------------
-- THE TOKEN IS NOT NEW
-- `gen_reference_token()` (20260807000002) already produces exactly the
-- required shape: 5 digits and 3 letters from `A-Z` less `I/L/O/U`, in
-- shuffled positions, drawn from pgcrypto's CSPRNG with rejection
-- sampling so no character and no position is biased. That function is
-- reused verbatim rather than reimplemented, so there is one audited
-- randomness path on the platform instead of two.
--
--   keyspace  10^5 x 22^3 x C(8,3) = 5.96e10  (~35.8 bits) per prefix
--
-- ---------------------------------------------------------------------
-- WHY A CENTRAL REGISTRY RATHER THAN A PER-TABLE UNIQUENESS CHECK
-- The obvious implementation — draw a token, `select 1 from <table>
-- where public_id = candidate`, redraw if taken — is wrong here, for a
-- reason specific to this schema: 20260618000011 puts `force row level
-- security` on every table in `public`. FORCE means the table owner is
-- subject to RLS too, so that existence check runs against the *visible*
-- rows, not all of them. A SECURITY DEFINER function would happily
-- report a candidate free because the row holding it is hidden by
-- policy, and the unique index would then reject the insert — turning a
-- collision from something handled into a failed request.
--
-- So uniqueness is adjudicated by `public_id_registry`, a table that
-- deliberately does *not* force RLS. It has RLS enabled with no policies
-- at all, which means no client role can read or write it under any
-- circumstances, while a SECURITY DEFINER function owned by the table
-- owner reaches it normally. The registry's primary key is the arbiter:
-- minting is an INSERT, and a duplicate raises `unique_violation` inside
-- a plpgsql block whose implicit savepoint lets the mint simply draw
-- again. There is no check-then-act window to race, which the per-table
-- variant could not have avoided even with RLS out of the way.
--
-- The registry buys two further properties that were worth having:
--
--   1. ONE GLOBAL NAMESPACE. A public id is unique across every entity
--      type, not merely within its own table. `SV285K7BV9` can never
--      also be a payment, so pasting an id into support tooling can
--      never be ambiguous, and the prefix is a convenience for humans
--      rather than the thing carrying uniqueness.
--   2. LOOKUP IN ONE HOP. `resolve_public_id` answers "what is this?"
--      without probing sixteen tables. 20260829000004 builds the admin
--      lookup on it.
--
-- IDS ARE NEVER REISSUED. Registry rows outlive the rows they name: when
-- an entity is deleted its id stays claimed, so a string that appeared in
-- an email, an invoice or an audit log can never later resolve to a
-- different record. `relation` is stored as text rather than `regclass`
-- for the same durability reason — a dropped table must not leave a
-- dangling OID in a permanent record.
-- =====================================================================

-- ---------------------------------------------------------------------
-- REGISTRY
--
-- `enable` without `force`, and no policies: unreachable from `anon` and
-- `authenticated` (RLS with zero policies denies everything), reachable
-- from the SECURITY DEFINER functions below as the owner. This is the one
-- table in `public` that must not be swept into the force-RLS rule, so
-- the reason is recorded here rather than left to be rediscovered.
-- ---------------------------------------------------------------------
create table if not exists public.public_id_registry (
  public_id  text primary key,
  -- Schema-qualified table name, e.g. `public.vendors`. Text, not
  -- regclass: a registry entry must stay readable after the table it
  -- names is gone.
  relation   text        not null,
  row_id     uuid        not null,
  created_at timestamptz not null default now(),
  constraint ck_public_id_shape check (public_id ~ '^[A-Z]{2}[0-9A-Z]{8}$'),
  constraint ux_public_id_row unique (relation, row_id)
);

comment on table public.public_id_registry is
  'One row per public identifier ever minted. Primary key adjudicates uniqueness across every entity type; rows are never deleted, so an id is never reissued.';

alter table public.public_id_registry enable row level security;
-- Intentionally no policies and intentionally no FORCE: see the header.

revoke all on table public.public_id_registry from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- THE IDENTIFIER
--
-- The prefix is validated rather than trusted. A typo'd or lower-cased
-- prefix passed from a trigger definition would otherwise mint ids in a
-- silently separate namespace that no lookup would ever recognise, and
-- the `ck_public_id_shape` check on the registry would only catch it at
-- insert time with a far less legible error.
-- ---------------------------------------------------------------------
create or replace function public.gen_public_id(p_prefix text)
returns text
language plpgsql
volatile
set search_path = public
as $$
begin
  if p_prefix is null or p_prefix !~ '^[A-Z]{2}$' then
    raise exception 'gen_public_id: prefix must be exactly two uppercase letters, got %',
      coalesce(quote_literal(p_prefix), '<null>')
      using errcode = '22023';
  end if;

  return p_prefix || public.gen_reference_token();
end;
$$;

comment on function public.gen_public_id(text) is
  'Category-prefixed public identifier: <2 uppercase letters><5 digits and 3 letters, shuffled>, e.g. SV285K7BV9.';

-- ---------------------------------------------------------------------
-- MINT — draw, claim, and return; redraw only on a real collision.
--
-- The INSERT is the uniqueness check. `exception when unique_violation`
-- opens an implicit subtransaction around the statement, so a collision
-- rolls back that one INSERT rather than the caller's whole transaction,
-- and the loop redraws. This is the same reasoning as the retry loops in
-- `request_quotation` / `create_booking` (20260807000001), moved down to
-- where every writer benefits instead of only the two RPCs.
--
-- Only a `public_id_registry_pkey` violation is retried. Any other unique
-- violation — notably `ux_public_id_row`, which fires when a row is
-- minted an id twice — is a genuine bug and is re-raised untouched, so
-- the loop can never mask one by spinning over it.
--
-- Twelve attempts is far past generous: at 5.96e10 per prefix a single
-- retry is already improbable, and the loop exists for concurrency
-- correctness, not for volume. Exhausting it means the keyspace or the
-- CSPRNG is broken, so it raises rather than returning a degraded id.
-- ---------------------------------------------------------------------
create or replace function public.mint_public_id(
  p_prefix   text,
  p_relation text,
  p_row_id   uuid
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_candidate  text;
  v_constraint text;
begin
  if p_row_id is null then
    raise exception 'mint_public_id: row id is required (%, %)', p_relation, p_prefix
      using errcode = '22023';
  end if;

  for i in 1 .. 12 loop
    v_candidate := public.gen_public_id(p_prefix);
    begin
      insert into public.public_id_registry(public_id, relation, row_id)
      values (v_candidate, p_relation, p_row_id);
      return v_candidate;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'public_id_registry_pkey' then raise; end if;
    end;
  end loop;

  raise exception 'public_id_generation_failed: % (prefix %)', p_relation, p_prefix
    using errcode = '23505';
end;
$$;

comment on function public.mint_public_id(text, text, uuid) is
  'Claims and returns a fresh public identifier for one row, retrying on registry collision.';

-- ---------------------------------------------------------------------
-- ASSIGNMENT IS THE TABLE'S JOB, NOT THE CALLER'S
--
-- Minting inside an RPC only makes ids unguessable for rows that happen
-- to arrive through that RPC, and they do not have to: RLS admits direct
-- client inserts on several of these tables. A BEFORE INSERT trigger
-- therefore overwrites whatever `public_id` was supplied, and a BEFORE
-- UPDATE OF trigger rejects any later change — so an id can be neither
-- chosen, squatted, nor rewritten, whatever path the row took.
--
-- This mirrors `tg_assign_reference_no` (20260807000001) exactly; the
-- reasoning there applies here unchanged.
--
-- The relation is built from `tg_table_schema`/`tg_table_name` rather than
-- taken from an argument, so the recorded value is always the table the
-- trigger actually fired on and cannot drift from the installer's call.
--
-- Not `tg_relid::regclass::text`, which looks equivalent and is not:
-- `regclass` output omits the schema whenever that schema is on the
-- `search_path`, and this function sets `search_path = public`. It would
-- therefore record `vendors` where `install_public_id`'s backfill records
-- `public.vendors` — the same table under two names, which would split the
-- registry and leave `admin_lookup_public_id` unable to parse half of it.
-- The trigger variables are always unqualified and always both present.
-- ---------------------------------------------------------------------
create or replace function public.tg_assign_public_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.public_id := public.mint_public_id(
      tg_argv[0],
      tg_table_schema || '.' || tg_table_name,
      new.id
    );
    return new;
  end if;

  if new.public_id is distinct from old.public_id then
    raise exception 'public_id is immutable (% -> %)', old.public_id, new.public_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function public.tg_assign_public_id() is
  'BEFORE INSERT: assigns public_id from mint_public_id(TG_ARGV[0], ...), ignoring any supplied value. BEFORE UPDATE OF public_id: rejects changes.';

-- ---------------------------------------------------------------------
-- INSTALLER
--
-- Sixteen tables receive identical treatment — column, backfill, NOT
-- NULL, unique index, trigger — and writing that out sixteen times is
-- sixteen chances to omit one step on one table. It is a function rather
-- than a DO block so 20260829000003 and any future table can call it and
-- get provably the same five steps.
--
-- WHY THE BACKFILL IS ROW-AT-A-TIME
-- `update t set public_id = mint_public_id(...)` in one statement would
-- be wrong. Every row of a single UPDATE sees the same snapshot, so the
-- registry INSERT is what saves it — but a set-based backfill would then
-- lean on the retry loop for *every* duplicate rather than for the rare
-- one. Looping is not the performance concern it looks like: each UPDATE
-- is its own command and sees the ones before it, so collisions revert to
-- the vanishingly rare case they are meant to be. These tables hold
-- thousands of rows, not millions.
--
-- The whole installer is idempotent — `if not exists`, `where public_id
-- is null`, `drop trigger if exists` — so re-running it on a partially
-- migrated database completes the job rather than failing or duplicating.
-- ---------------------------------------------------------------------
create or replace function public.install_public_id(p_table text, p_prefix text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_rel   text := format('public.%I', p_table);
  v_row   record;
  v_count int := 0;
begin
  if p_prefix !~ '^[A-Z]{2}$' then
    raise exception 'install_public_id: prefix must be exactly two uppercase letters, got %',
      coalesce(quote_literal(p_prefix), '<null>') using errcode = '22023';
  end if;

  if to_regclass(v_rel) is null then
    raise notice 'install_public_id: %  — table absent, skipped', v_rel;
    return;
  end if;

  -- 1. Column. Nullable for now: the backfill has not run yet.
  execute format('alter table %s add column if not exists public_id text', v_rel);

  -- 2. Backfill, one row per statement (see above).
  for v_row in execute format('select id from %s where public_id is null order by id', v_rel)
  loop
    execute format('update %s set public_id = $1 where id = $2', v_rel)
      using public.mint_public_id(p_prefix, v_rel, v_row.id), v_row.id;
    v_count := v_count + 1;
  end loop;

  -- 3. Now that no row is null, the constraint can be stated.
  execute format('alter table %s alter column public_id set not null', v_rel);

  -- 4. Local uniqueness. The registry already guarantees this globally;
  --    the index restates it where the planner can use it, and is what
  --    makes `where public_id = $1` an index lookup rather than a scan.
  execute format(
    'create unique index if not exists %I on %s (public_id)',
    'ux_' || p_table || '_public_id', v_rel
  );

  -- 5. Triggers: assign on insert, freeze thereafter.
  execute format('drop trigger if exists trg_public_id on %s', v_rel);
  execute format(
    'create trigger trg_public_id before insert or update of public_id on %s '
    'for each row execute function public.tg_assign_public_id(%L)',
    v_rel, p_prefix
  );

  raise notice 'install_public_id: % (%) — % row(s) backfilled', v_rel, p_prefix, v_count;
end;
$$;

comment on function public.install_public_id(text, text) is
  'Adds public_id to a table: column, row-at-a-time backfill, NOT NULL, unique index, assign/freeze triggers. Idempotent.';

-- ---------------------------------------------------------------------
-- RESOLVE — the inverse, for support tooling.
--
-- Returns the relation and row id an identifier names, or nothing. It
-- reports on ids whose row has since been deleted too (the registry
-- keeps them), which is the honest answer to "what was SV285K7BV9?" and
-- is why 20260829000004's admin lookup can distinguish "no such id" from
-- "that record is gone".
-- ---------------------------------------------------------------------
create or replace function public.resolve_public_id(p_public_id text)
returns table (relation text, row_id uuid, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.relation, r.row_id, r.created_at
  from public.public_id_registry r
  where r.public_id = upper(btrim(coalesce(p_public_id, '')));
$$;

comment on function public.resolve_public_id(text) is
  'Maps a public identifier to the relation and row it names. Case- and whitespace-insensitive.';

-- ---------------------------------------------------------------------
-- A caller able to mint identifiers at will, or to enumerate the registry
-- through `resolve_public_id`, is a nuisance the platform has no reason
-- to allow. The triggers and the admin RPCs are SECURITY DEFINER and so
-- reach these as the owner regardless of the grants below.
--
-- (`public` is the PUBLIC pseudo-role and covers every role without an
-- explicit grant; `anon` and `authenticated` are named separately because
-- 0014's blanket `grant execute on all functions` gave them one, and
-- because a fresh CREATE FUNCTION grants EXECUTE to PUBLIC by default —
-- this revoke is what takes it back.)
-- ---------------------------------------------------------------------
revoke execute on function public.gen_public_id(text)                from public, anon, authenticated;
revoke execute on function public.mint_public_id(text, text, uuid)   from public, anon, authenticated;
revoke execute on function public.install_public_id(text, text)      from public, anon, authenticated;
revoke execute on function public.resolve_public_id(text)            from public, anon, authenticated;
