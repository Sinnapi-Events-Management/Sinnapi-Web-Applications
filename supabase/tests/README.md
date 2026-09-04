# supabase/tests

Plain SQL assertion scripts. Each file raises on the first thing that is not true and
prints nothing otherwise, so a run either ends in `ALL ASSERTIONS PASSED` or stops on the
line that failed.

There is no test toolchain in this repo and these do not add one. They are run with `psql`
against a throwaway Postgres that has the whole migration chain applied — which is also the
only way to verify a migration here, because `supabase start` cannot apply the chain from
scratch (`20260618000013_storage.sql` inserts into `storage.buckets`, and the storage
container creates that schema _after_ the CLI runs migrations).

## Why SQL and not a TypeScript harness

The bugs these catch are plpgsql bugs, and plpgsql bodies are **not resolved at CREATE
time**. A migration that applies perfectly cleanly can still contain a wrong `drop function`
signature, a `RETURNS TABLE` output name shadowing a table column, or a body referring to a
column that does not exist. The only thing that surfaces any of it is calling the function.
So the tests call the functions.

## Running them

```sh
# 1. a raw Postgres with the Supabase schemas, roles and auth.uid() already in it
docker run -d --name sinnapi-test -e POSTGRES_PASSWORD=postgres -p 55432:5432 \
  public.ecr.aws/supabase/postgres:17.6.1.166

# 2. shim what the storage/auth runtime containers would otherwise create
docker exec -i sinnapi-test psql -U supabase_admin -d postgres <<'SQL'
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[],
  created_at timestamptz default now(), updated_at timestamptz default now(),
  owner uuid, avif_autodetection boolean default false);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, metadata jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(), path_tokens text[], version text);
alter table auth.users add column if not exists email_confirmed_at timestamptz;
SQL

# 3. apply every migration in order, stopping on the first error
for f in supabase/migrations/*.sql; do
  docker exec -i sinnapi-test psql -v ON_ERROR_STOP=1 -q -U supabase_admin -d postgres < "$f" \
    || { echo "FAILED: $f"; break; }
done

# 4. run a test
docker exec -i sinnapi-test psql -v ON_ERROR_STOP=1 -U supabase_admin \
  -d postgres < supabase/tests/0904_payment_attribution.test.sql
```

Connect as **`supabase_admin`**, not `postgres` — `postgres` lacks rights on the `storage`
schema. Note that `supabase_admin` is a superuser and therefore bypasses RLS entirely, so a
test run as it proves nothing about policies; impersonate with
`set local request.jwt.claim.sub = '<uuid>'` (which is what `auth.uid()` reads) and
`set local role authenticated` when the policy is the thing under test.

### Known pre-existing blocker

`20260815000003_messaging_unread_and_notify.sql` fails with `cannot change return type of
existing function` on `mark_conversation_read(uuid)` — it needs a `drop function` before its
`create or replace`. Unrelated to anything these tests cover; work around it during a run with

```sh
docker exec -i sinnapi-test psql -U supabase_admin -d postgres \
  -c 'drop function if exists public.mark_conversation_read(uuid);'
```

immediately before applying that file.

## Files

| File                                | Proves                                                                                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0904_payment_attribution.test.sql` | An IPN-driven payment transition lands as `actor_kind = 'psp_webhook'`, not `'system'`; a client checkout lands as `'user'`; the reconciliation sweep is distinguishable from both; and a signed-in caller cannot forge any of it. |
| `0904_payment_trace.test.sql`       | One correlation id returns the complete life of a transaction, in order, across all seven tables.                                                                                                                                  |
