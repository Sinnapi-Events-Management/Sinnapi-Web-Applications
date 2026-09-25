# Sending the credentials

The import parked 172 one-time passwords in `migration_legacy_users.temp_password`
and mailed nobody. This is how they go out.

**168 emails: 71 clients + 97 vendors.** Four imported accounts are deliberately
not mailed — see _Who is left out_ below. (The blocked account is one of the 98
imported vendors, which is why the vendor figure here is 97.)

## Before you start

Three things must be true, and the first two are not assumptions I could make
for you:

1. **The portal URLs are set on the DEPLOYED project**, not just in your local
   `supabase/functions/.env`. The function reads Supabase's deployed secrets:

   ```
   CLIENT_PORTAL_URL = https://app.sinnapi.com
   VENDOR_PORTAL_URL = https://portal.sinnapi.com
   ```

   Check with `supabase secrets list`. The `status` and `test` calls both echo
   back the URLs they will actually use — confirm there before sending anything
   real. A wrong link in 168 emails cannot be recalled.

2. `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` are set — the same transactional
   transport the rest of the platform already uses.

`support@sinnapi.com` is set as `Reply-To` on every message, so replies land in
the monitored mailbox rather than the `SMTP_USER` inbox.

Then deploy and add the tracking columns:

```bash
supabase functions deploy send-migration-credentials
# then, in the SQL editor:
#   supabase/migration-legacy/04_mail_tracking.sql
```

`04_mail_tracking.sql` prints what it queued. Expect **queued 168**
(71 clients, 97 vendors) and **not_queued 4**.

## The four steps

Set these once:

```bash
PROJECT=https://mnecsflrsyackeibixfn.supabase.co
SRK=<secret key>
call () { curl -s -X POST "$PROJECT/functions/v1/send-migration-credentials" \
  -H "Authorization: Bearer $SRK" -H 'Content-Type: application/json' -d "$1" | jq; }
```

**Which key.** This project has been migrated to Supabase's new API key format, so
`SRK` is the **`sb_secret_…` secret key**, not the legacy `service_role` JWT.
Verified the hard way: the legacy JWT reaches the function and is rejected by
`isServiceRoleCaller`, because `SUPABASE_SERVICE_ROLE_KEY` in the function's own
environment now holds the `sb_secret_…` value.

Get it from **Dashboard → Project Settings → API Keys → `secret` → Reveal**.
`supabase projects api-keys` masks it (and CLI v2.40.7 has no `--reveal` flag),
so the dashboard is the route.

### 1. Check what it thinks it is about to do

```bash
call '{"action":"status"}'
```

Returns the queue counts **and the two portal URLs**. Read the URLs. This is the
cheapest moment to catch a wrong one.

### 2. Test send — both templates, to you, with a fake password

```bash
call '{"action":"test","email":"you@sinnapi.com"}'
```

You get two `[TEST]` emails, one client and one vendor. They use a dummy
password and touch no queue row, so nothing is consumed and no real credential
is exposed. (Those two do not count against the hourly cap either, since the cap
is measured from `mail_sent_at` on real rows — so on a 50/hour plan a test send
plus a full batch is 42, still inside the limit.) Check: the sign-in buttons go where you expect, the logo renders,
the support email and phone are right, and it does not land in spam.

### 3. Pilot — five real accounts

```bash
call '{"action":"send","only":["a@example.com","b@example.com"]}'
```

Real credentials to real people. Pick a couple of clients and a couple of
vendors you can actually phone. **Confirm at least one of them signs in and is
forced to change their password** before going further. That is the check the
test send cannot give you.

### 4. The rest

```bash
call '{"action":"send"}'          # 25 per call by default
```

Repeat until `remaining` is 0. Each call reports `sent`, `failed`, `remaining`,
`sentLastHour`, `hourlyCap` and up to 20 errors.

If you get `throttled: true`, the hour is full — wait and call again. Nothing
was claimed and nothing was lost.

To go in larger or smaller steps:

```bash
call '{"action":"send","limit":20}'
```

Then confirm:

```bash
call '{"action":"status"}'        # expect sent 168, queued 0, failed 0
```

## Pacing, and the Namecheap limit

Your SMTP host is Namecheap cPanel shared hosting, which caps outbound mail
**per domain, per hour**, and is blunt about the consequence:

> if we find a script that is sending out more than allowed, it will be
> disabled until you contact support

| Plan             | Limit       |
| ---------------- | ----------- |
| Stellar          | **50/hour** |
| Stellar Plus     | 200/hour    |
| Stellar Business | 10,000/hour |

You do not know which plan you are on, so the function assumes **Stellar** and
enforces a hard ceiling of **40 sends per rolling hour**.

**Why 40 and not 50.** That quota is shared by the whole domain. Password
resets, signup confirmations and `notification-dispatch` all draw on it. A
migration run that ate the entire allowance would take the platform's own
transactional mail down with it — and that is a much harder failure to diagnose
than a slow credential send. The 10/hour left over is for them.

The cap is **enforced, not suggested**: before claiming anything, the function
counts rows with `mail_sent_at` inside the trailing hour and shrinks the batch
to fit. It holds across invocations, across concurrent callers and across a cron
schedule. When there is no headroom it returns `throttled: true` and HTTP 200 —
you did nothing wrong, come back later.

```
MIGRATION_MAIL_GAP_MS=1500       # pause between messages
MIGRATION_MAIL_LIMIT=25          # max per invocation (Edge Function wall clock)
MIGRATION_MAIL_HOURLY_CAP=40     # hard ceiling per rolling hour
```

Two limits, doing different jobs: `MIGRATION_MAIL_LIMIT` keeps one invocation
inside the ~150s Edge Function timeout (25 x (1.5s + ~2s SMTP) is about 87s);
`MIGRATION_MAIL_HOURLY_CAP` keeps the day inside Namecheap's quota.

**At the defaults, 168 emails takes about 5 hours** — two calls an hour, roughly
5 hours of elapsed time. That is fine; there is no deadline on a credential
send, and being throttled by your host is considerably worse.

### Find your real limit and this gets much faster

Your plan name is in the Namecheap dashboard under Hosting List. On **Stellar
Plus** you can safely do:

```
MIGRATION_MAIL_HOURLY_CAP=150
```

which finishes the whole send in about two hours. cPanel's _Email Deliverability_
or _Track Delivery_ page will also show you what the server is actually
enforcing, and Namecheap support will tell you outright if you ask.

## If something fails

Failures are recorded per recipient, not just counted:

```sql
select email, legacy_kind, mail_status, mail_attempts, mail_error
from public.migration_legacy_users
where mail_status = 'failed'
order by email;
```

A row is retried automatically on the next `send` call until `mail_attempts`
reaches 3, then it stops and stays `failed`. To give one another try:

```sql
update public.migration_legacy_users
   set mail_status = 'pending', mail_attempts = 0, mail_error = null
 where email = '...';
```

**A transport fault stops the whole run.** If the error mentions AUTH, TLS, DNS
or "not configured", the problem is the SMTP settings, not the recipient — the
function breaks out rather than burning every remaining recipient's attempts on
a fault that will hit them all identically. Fix the setting and call again.

## Who is left out, and why

|                    | Count | Why                                                                                                                                                                                                                                            |
| ------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `done@gmail.com`   | 1     | `profile_blocked` with a permanent auth ban. The password is valid; sign-in is refused. Mailing it would produce a working-looking secret that cannot be used — the case `resend-vendor-credentials` calls "a support ticket by construction". |
| Pending applicants | 3     | They hold the client role only and their vendor application is `submitted`, undecided. Mail them through `promote-intake` or the admin console once you have reviewed them; both already send the right message per outcome.                   |

They keep `mail_status = null` — visibly not queued, rather than invisibly
absent. `04_mail_tracking.sql` lists them by name.

## Afterwards

Once `status` reports every recipient `sent`, the plaintext passwords have done
their job:

```sql
alter table public.migration_legacy_users drop column temp_password;
```

Do it promptly. Each one is a live credential until its holder signs in and is
forced to replace it, and a production table holding 168 working passwords is a
standing liability with no remaining purpose.

**Do not drop the table itself** — it is still the only record of the legacy id
mapping for 102 accounts.

Anyone who loses their email before using it has supported routes already:
`resend-vendor-credentials` for a vendor who has never signed in, and
`send-password-reset` for anybody.
