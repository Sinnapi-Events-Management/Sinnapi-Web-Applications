# WhatsApp notifications

Every event that emails someone today also sends them a short WhatsApp message,
through the **Meta WhatsApp Cloud API**. Email is unchanged; WhatsApp is a
second channel next to it.

Status: **steps 1–6 built; step 4 waiting on Meta; step 7 (end-to-end) next** (2026-11-03).
The test account is locked by Meta (error 131031); a review has been requested.

## How it fits the existing pipeline

```
action (e.g. client requests a quote)
  → notify_party() writes the in-app row               (bell)
  → tg_notification_email  → outbox row (email)         → notification-dispatch → SMTP/Resend
  → tg_notification_whatsapp → outbox row (whatsapp)    → notification-dispatch → Meta Cloud API   ← NEW
```

- WhatsApp gets **its own outbox row**, separate from the email row, so a failed
  WhatsApp send retries on its own and never re-sends the email (or the reverse).
- "Should this event send a WhatsApp?" is the same rule as email: a
  `notification_templates` row exists for `(trigger.audience, 'whatsapp')`.
  For WhatsApp that row also names the **Meta template** to use and the order
  of its variables, because Meta only accepts pre-approved templates, not free text.
- The recipient is always a profile, and the number is always `profiles.phone`.
  A vendor's number is its owner's number.

## Decisions (confirmed with the product owner, 2026-11-02)

| Topic                 | Decision                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider              | Meta WhatsApp Cloud API, called directly (no Twilio or other middleman)                                                                                 |
| Recipients            | Clients, vendors and staff (admins), each on their own profile phone                                                                                    |
| Phone format          | Stored as E.164 (`+256772123456`). **No guessing**: a number with no country code is treated as invalid and the user is asked to fix it                 |
| Phone inputs          | Every phone field in every portal gets a country-code picker, defaulting to Uganda (+256)                                                               |
| Fix prompt            | On login, a user with a missing or invalid phone sees a dismissible dialog ("Later" closes it); it shows again at every login until fixed               |
| Opt-in                | On by default for anyone with a valid number. A "WhatsApp notifications" switch on the profile turns it off, and so does replying STOP. Sign-up says so |
| Chat messages         | Once per burst: one WhatsApp until the recipient opens the chat, then the next message may send another                                                 |
| Templates             | One Meta template per event (~57), mirroring each email                                                                                                 |
| Language              | English only (`en`)                                                                                                                                     |
| Support desk          | No shared support number; staff with support permission get it on their own phone                                                                       |
| Quiet hours           | None. Send immediately                                                                                                                                  |
| Replies to the number | Forwarded to the support inbox email, plus one auto-reply per 24h ("use Messages in the app"). STOP and START are handled automatically                 |

## Steps

Mark each one done here as it lands.

- [ ] **0. Meta setup (owner)**: see the guide below. The build can start before
      this finishes by using Meta's free test number.
- [x] **1. Database**: migrations `20261103000001` (enum) and `20261103000002`
      (everything else). Verified against a scratch Postgres on 2026-11-03.
  - [x] add `whatsapp` to the `notification_channel` enum
  - [x] `notification_templates`: add `provider_template` (the Meta template name)
        and `params` (ordered list of payload keys that fill `{{1}}`, `{{2}}`, …),
        plus `resolve_whatsapp_template()`
  - [x] `profiles.phone_e164`: a **generated** column, so there's no backfill and
        it can't drift. Numbers with a `+country` code are normalised; everything
        else is null, and those owners get the fix prompt
  - [x] `profiles.whatsapp_opt_out_at` (null = on). The "fix your number" prompt
        re-asks at every login, so it needs no database column
  - [x] `enqueue_whatsapp_notification()`, plus the `trg_notification_whatsapp`
        trigger (covers routes A and B) and `trg_outbox_whatsapp` (covers route C,
        the support receipt)
  - [x] chat burst rule: nothing needed. `tg_message_notify` already notifies only
        on the first unread message, and WhatsApp follows the notification
  - [x] `whatsapp_messages` log table (unique `outbox_id` gives idempotency;
        `provider_message_id` is for the webhook)
  - [x] dispatcher guard: `payload.channel = 'whatsapp'` rows are routed before the
        addressed path, so they can never be re-sent as email
- [x] **2. Shared sender**: `supabase/functions/_shared/whatsapp.ts`. It sends
      a template, sorts Meta's errors into "retry" and "permanent", checks
      E.164, and cleans up blanks (no newlines or empty values, which Meta
      rejects). Smoke test: `scripts/whatsapp-smoke.ts` sends `hello_world`
      to `WHATSAPP_TEST_TO`
- [x] **3. Dispatcher**: `dispatchWhatsApp` in `notification-dispatch`. It
      re-checks phone, opt-out and template at send time, and writes the
      `whatsapp_messages` row before calling Meta (idempotency). Retryable
      errors make the job retry; permanent ones are logged and the row is
      closed. Extra blanks every template may use: `recipient_name`,
      `recipient_first_name`, `link` (the portal deep link, placed in the
      message body because Meta URL buttons need a single fixed domain).
      The addressed path is covered by route B (step 1), so it needs no change
- [ ] **4. Templates**
  - [x] all 57 written in `scripts/whatsapp/catalog.ts`, the **single source of
        truth** for the wording. Every value used is checked against the same
        event's email template, which proves the data carries it
  - [x] `scripts/whatsapp/templates.ts check` enforces Meta's rules: no value at
        the start or end, no two values touching, each value once, samples
        present, length limits. Amounts are one value (`{{total_money}}` =
        "UGX 2,450,000"), which the dispatcher now produces for every amount key
  - [x] seed migration `20261103000003_whatsapp_templates.sql` (generated by
        `templates.ts sql`). All rows go in **switched off**
  - [ ] submit to Meta: `templates.ts submit` creates all 57 through the API (no
        manual forms). Needs `WHATSAPP_BUSINESS_ACCOUNT_ID`. Blocked while the
        test account is locked (error 131031)
  - [ ] `templates.ts status`: when approved, run the SQL it prints to switch them on
  - [ ] when the CEO's real account is ready: run `submit` again with the real
        account's values (templates are approved per account)
- [x] **5. Webhook**: edge function `whatsapp-webhook` (public, `verify_jwt =
    false` in `config.toml`) plus migration `20261103000004`
  - [x] GET handshake (`hub.verify_token` = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
  - [x] POST signature check (`X-Hub-Signature-256` with `WHATSAPP_APP_SECRET`);
        a missing secret rejects every request
  - [x] statuses go to `whatsapp_record_status()`, which only moves forward
        (sent → delivered → read; failed wins), so out-of-order callbacks are harmless
  - [x] STOP / START (the whole message, any case) go to `whatsapp_set_opt_out()`,
        covering every profile with that phone, and send a confirmation once (not on redelivery)
  - [x] an unknown message id reported as `failed` within 10 minutes returns 503
        so Meta retries (it can beat the dispatcher writing the id); older ones are acknowledged
  - [x] any other reply is forwarded to the support inbox email
        (`SUPPORT_MESSAGES_INBOX`, the same secret the support-message copy uses),
        and the sender gets one auto-reply per 24h pointing to in-app Messages
        (product decision 2026-11-03). Stored in `whatsapp_inbound`; a Meta
        redelivery finishes what failed and repeats nothing. Photos and voice
        notes aren't forwarded; the email says what kind of message it was
  - [x] the dispatcher's email send moved into `_shared/deliverEmail.ts`
        so the webhook sends the same way (SMTP, then Resend)
  - [x] unit tests: `deno test supabase/functions/whatsapp-webhook/parse.test.ts`
        (includes the real "account locked" callback)
  - [ ] deploy to **develop** and register the URL in Meta (see "Deploying to develop")
- [x] **6. Portals** (type-checked, linted; DB rule verified on scratch Postgres)
  - [x] `@sinnapi/ui/phone`: `PhoneField` (searchable country picker, Uganda
        first, then East Africa, then A–Z, beside the number), `phoneProblem` /
        `isValidPhone` (libphonenumber-js), `formatPhone`. `@sinnapi/ui/forms`:
        `ControlledPhoneField` + `phoneSchema()`. A legacy number shows with
        **no country chosen** and the error "Choose the country for this number":
        never guessed
  - [x] used by every phone input: client profile, vendor profile, admin profile,
        admin Users (create/edit staff), public vendor application, public contact
        form (hidden input carries E.164, since that form reads FormData)
  - [x] server side: migration `20261103000005` rejects a non-E.164 phone typed by a
        signed-in person (system copies such as approval are exempt), and tidies
        spacing. `create-staff` and `vendor-application` check E.164 too
  - [x] login prompt `PhoneNumberPrompt` + `usePhoneNumberPrompt`, mounted by
        `PhonePromptHost` in each portal's AppShell. "Later" lasts until the next
        sign-in (keyed on `user.last_sign_in_at`). The vendor host stays hidden on
        `/getting-started` and `/onboarding` so it never covers the wizard
  - [x] `WhatsAppUpdatesSwitch` under the phone on all three profile pages. Saves
        immediately (`useWhatsAppPreference`) and is disabled until the saved number is valid
  - [x] sign-up notice: client sign-up (`SignUpConsent`) and the vendor application's
        phone helper text
  - [x] admin Notification Templates: WhatsApp tab, chip and summary tile. Its
        on/off toggle is how an admin switches on a template once Meta approves it
        (an alternative to the SQL from `templates.ts status`)
  - Deploy order: the public website **before or together with** the
    `vendor-application` function. Otherwise the old form's local numbers are
    rejected by the new server check
- [ ] **7. Test and roll out**: end to end on the Meta test number, then
      production secrets, deploy order and a smoke test

## Secrets (edge functions)

| Name                            | What it is                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `WHATSAPP_PHONE_NUMBER_ID`      | ID of the sender number (Meta → WhatsApp → API Setup)                                                                |
| `WHATSAPP_ACCESS_TOKEN`         | Permanent System User token, never the 24-hour test token                                                            |
| `WHATSAPP_BUSINESS_ACCOUNT_ID`  | WhatsApp Business Account ID (API Setup). Used only by `scripts/whatsapp/templates.ts` to submit and check templates |
| `WHATSAPP_APP_SECRET`           | App secret, used to verify webhook signatures                                                                        |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Any random string you choose; typed into Meta when registering the webhook                                           |
| `WHATSAPP_API_VERSION`          | Graph API version, e.g. `v23.0`                                                                                      |

If they are unset, WhatsApp is skipped and logged, never retried into the
dead-letter queue. Same rule as `SUPPORT_MESSAGES_INBOX`.

## Deploying to develop

> **The Supabase CLI in this repo is linked to PRODUCTION** (`mnecsflrsyackeibixfn`).
> Every command below names the develop project (`oxrndnpnecrwldbigxek`)
> explicitly. Never run a bare `supabase db push` / `functions deploy` / `secrets set`.

1. **Secrets.** In `supabase/functions/.env`, add
   `WHATSAPP_APP_SECRET` (developers.facebook.com → your app → App settings →
   Basic → App secret → Show) and `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (any random
   string, e.g. the output of `openssl rand -hex 24`). Then push only the
   WhatsApp lines. Don't push the whole file: it holds a dev-only
   `CRON_DISPATCH_SECRET` that must not overwrite the real one:
   ```
   supabase secrets set --project-ref oxrndnpnecrwldbigxek \
     --env-file <(grep '^WHATSAPP_' supabase/functions/.env | grep -v '^WHATSAPP_TEST_TO=')
   ```
2. **Database.** Use develop's connection string (Supabase dashboard → develop
   project → Connect → "Session pooler" URI):
   ```
   supabase db push --db-url "<develop connection string>"
   ```
3. **Functions:**
   ```
   supabase functions deploy notification-dispatch --project-ref oxrndnpnecrwldbigxek
   supabase functions deploy whatsapp-webhook     --project-ref oxrndnpnecrwldbigxek
   ```
4. **Register the webhook in Meta.** developers.facebook.com → your app →
   WhatsApp → Configuration → Webhook → Edit:
   - Callback URL: `https://oxrndnpnecrwldbigxek.supabase.co/functions/v1/whatsapp-webhook`
   - Verify token: the same `WHATSAPP_WEBHOOK_VERIFY_TOKEN` value
   - then **Webhook fields → `messages` → Subscribe**

## Step 0: Meta setup guide (for the owner)

Checkout this artifact: https://claude.ai/artifact/FPixs8LDSZaLwZL2WGMiaz#b886a2f6-99b8

You need a laptop and about an hour of clicking. Meta's business verification
can then take anywhere from a few days to two weeks, so start early.

1. **Business account.** Go to <https://business.facebook.com> and create a
   business portfolio named after the legal company. Use a work email.
2. **Business verification.** Business settings → Security Centre → Start
   verification. Upload the certificate of incorporation and proof of address.
   The legal name must match the documents exactly.
3. **Developer app.** Go to <https://developers.facebook.com> → My Apps → Create app
   → type **Business** → link it to the portfolio above. Add the **WhatsApp** product.
4. **Test number (free, works immediately).** WhatsApp → API Setup shows a test
   sender number and a temporary token. Add up to 5 of your own phones as test
   recipients. This is enough for us to build and test everything.
5. **Real sender number.** Buy a number (a new SIM or a landline that can receive
   an SMS or voice code) that is **not** on the WhatsApp or WhatsApp Business app.
   If it is, delete that WhatsApp account first. In API Setup choose **Add phone
   number**, set the display name to "Sinnapi" (Meta reviews it) and verify the code.
6. **Payment method.** WhatsApp Manager → Settings → Payment methods → add a card.
   Utility messages to Uganda cost a few US cents each.
7. **Permanent token.** Business settings → Users → System users → Add (Admin role)
   → Assign assets: your app (full control) and your WhatsApp account (full control)
   → Generate token with the `whatsapp_business_messaging` and
   `whatsapp_business_management` permissions and **no expiry**. Store it in a
   password manager. This becomes `WHATSAPP_ACCESS_TOKEN`.
8. **Collect these values** and send them to whoever deploys (never commit them):
   Phone number ID, WhatsApp Business Account ID, App secret (App settings → Basic),
   and the permanent token.
9. **Templates.** After step 4 of the build, submit the generated list in
   WhatsApp Manager → Message templates, all with category **Utility** and language
   **English**.
10. **Webhook.** After step 5 of the build: App → WhatsApp → Configuration → Webhook.
    The callback URL is `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`
    and the verify token is the value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Subscribe
    to the `messages` field.
