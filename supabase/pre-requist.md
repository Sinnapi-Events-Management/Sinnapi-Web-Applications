# Prerequisites before applying

## 1. Vault and extensions

Create these in Supabase → Vault: `bank_encryption_key` (bank-field crypto), and for cron `functions_base_url` + `service_role_key`. Enable extensions pgsodium/Vault, pg_cron, pg_net.

## 2. Edge Function secrets

Every variable the functions read is listed, with sandbox and live values, in `supabase/functions/.env.example`. Locally, copy it to `supabase/functions/.env` (git-ignored; `supabase functions serve` loads it). Hosted, set them with `supabase secrets set …`. The PSP block is the one with a manual step in it, below; the portal URLs, `TURNSTILE_SECRET`, `SMTP_*`/`EMAIL_*`, `NEWSLETTER_*`, `FX_API_URL` and `PROFANITY_LIST` are plain values with their defaults noted in that file.

`ALLOWED_ORIGINS` must contain each portal's origin (`https://app.sinnapi.com` for the client portal in production). It fails closed: with it unset, no browser can call `create-payment` and every Pay button dies with a CORS error.

## 3. Pesapal — five variables and one registration

Pesapal has two separate callbacks and they are configured in two separate places. Getting only one of them right produces a system that looks like it works.

| Variable                  | What it is                                                                                                                                               | Sandbox                                                         | Live                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| `PESAPAL_BASE_URL`        | API base. **The code defaults to live when unset**, so sandbox must be explicit.                                                                         | `https://cybqa.pesapal.com/pesapalv3`                           | `https://pay.pesapal.com/v3`                 |
| `PESAPAL_CONSUMER_KEY`    | Merchant API key. Per environment.                                                                                                                       | UGX demo merchant from developer.pesapal.com/api3-demo-keys.txt | Merchant dashboard → Integrations → API keys |
| `PESAPAL_CONSUMER_SECRET` | Its secret.                                                                                                                                              | same file                                                       | same page                                    |
| `PESAPAL_CALLBACK_URL`    | Where the **browser** goes after the hosted page. The client portal's return route; it reads the outcome from our database, never from the query string. | `http://localhost:3001/payments/return`                         | `https://app.sinnapi.com/payments/return`    |
| `PESAPAL_IPN_ID`          | The id Pesapal returned when we registered the **webhook** URL. Not a URL. Bound to one environment and one exact URL.                                   | from `yarn pesapal:ipn --env sandbox …`                         | from `yarn pesapal:ipn --env live …`         |

### 3a. Register the IPN and capture the id

Nothing in the functions calls Pesapal's RegisterIPN; it is done once per environment, by hand, with the script:

```
PESAPAL_CONSUMER_KEY=… PESAPAL_CONSUMER_SECRET=… \
  yarn pesapal:ipn --env sandbox --project-ref <20-letter project ref>
```

(or `--env-file supabase/functions/.env`, or `--url https://…/functions/v1/psp-pesapal-webhook` for a custom domain). It registers the webhook URL as a POST notification, prints the `ipn_id`, lists everything registered on the merchant so a stale entry is visible, and prints the exact `supabase secrets set PESAPAL_IPN_ID=… PESAPAL_BASE_URL=…` to run. It changes nothing on the Supabase project itself. `--list` only lists.

The IPN URL must be publicly reachable over https. For local development that means the IPN still points at a **deployed** function (or a tunnel); the browser callback can stay on localhost because it is the client's own browser that follows it.

### 3b. When to re-register

The id is Pesapal's name for one URL on one environment. Re-run the script, and set the new id, whenever any of these change:

- the Supabase project ref (a new project, a restore into a different one, staging vs production);
- a custom domain in front of the functions, or moving off one;
- sandbox ↔ live (the two APIs have separate registries, and each needs its own id);
- the function's path (renaming `psp-pesapal-webhook`).

Deploying new code to the same URL does **not** need it.

### 3c. How a stale id fails, and how to tell

It fails silently. `SubmitOrderRequest` accepts an unknown or wrong-environment `notification_id`, the client pays on Pesapal's page, and Pesapal notifies nothing. The client's browser comes back to `/payments/return`, which honestly reports "still processing" and promises an email that never comes; the booking never funds; no exception is raised because, as far as the database knows, the checkout is simply still open. The one thing that eventually notices is `payment-reconciliation`, which re-queries stuck payments by their provider reference — hours later.

Verify after any change by sending one sandbox payment through and checking:

```sql
select received_at, payload from public.payment_logs
 where provider = 'pesapal' and direction = 'webhook' order by received_at desc limit 5;
```

A row with `event_type = 'ipn'` for the new order's tracking id means the registration is live. No row within a minute of paying means the id is stale, the URL is wrong, or the function is refusing the request — check the function logs before touching the registration.

## 4. PayPal

`PAYPAL_BASE_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_RETURN_URL`, `PAYPAL_CANCEL_URL` — values and where to get them are in `.env.example`. The webhook id is the PayPal-side equivalent of the IPN id and has the same re-registration rule when the function URL changes. No portal route serves the PayPal return or cancel URL yet; point both at the client portal's `/bookings` until one exists.

## 5. Bot protection

Set `TURNSTILE_SECRET` on the functions — `supabase secrets set TURNSTILE_SECRET=<widget secret>`. It is the Cloudflare Turnstile secret paired with the site key the four apps ship (`VITE_TURNSTILE_SITE_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), and `_shared/turnstile.ts` fails closed without it — `portal-sign-in`, `client-sign-up`, `vendor-application` and `send-password-reset` will refuse every anonymous request until it is set. The widget's domain list must include each portal's production hostname plus `localhost` and `127.0.0.1`, or the browser never produces a token in the first place.

**Auth → Attack Protection → "Enable Captcha protection" must stay OFF.** Turnstile is enforced one layer higher, in the Edge Functions, and a Turnstile token is single-use: `portal-sign-in` redeems it with Cloudflare before it verifies the password, so it cannot also hand the same token to GoTrue. With the dashboard setting on, every `signInWithPassword` the function makes is refused with `captcha_failed` regardless of what was typed — password sign-in dies in all three portals, and the admin profile page's re-authentication (`usePasswordChange`) starts insisting the current password is wrong. Confirmation and recovery links keep working throughout, because `verifyOtp` is not a password grant, which is what makes the fault look like "everyone forgot their password". Nothing in the four apps ever passes a `captchaToken` to GoTrue, so turning it off removes no protection. `portal-sign-in` detects this specific refusal and answers 503 with the remedy in the function logs rather than pretending the credentials were wrong.

Two design notes (non-blocking): bank numbers use pgp_sym_encrypt with a Vault-stored key (swap to native pgsodium keyrings if you prefer managed keys); and approve_escrow_release auto-creates the payout against the vendor's primary bank account — if none exists it leaves escrow at payout_approved for the vendor to add banking, rather than erroring.

## Newsletter SMTP — TLS certificate name

`newsletter-dispatch` fails every campaign message with `ESOCKET invalid peer certificate: NotValidForName` when the mail host's TLS certificate does not cover the hostname in `NEWSLETTER_SMTP_HOST`. This is the normal state of affairs on shared cPanel hosting: `mail.sinnapi.com` resolves to a Namecheap shared server that presents the provider's own wildcard (`CN=*.web-hosting.com`, SANs `*.web-hosting.com` and `web-hosting.com`), which does not include the customer domain. Verification fails during the handshake and the socket closes before AUTH, so the failure says nothing about mail.

Deno rejects this inside rustls, so `tls: { rejectUnauthorized: false }` does not help and is no longer present in the code — it never worked here and implied a safety valve that does not exist.

Two supported fixes, in order of preference:

1. **Point the transport at a relay whose certificate covers its own name.** `sinnapi.com`'s MX records are Namecheap Private Email, so the mailboxes live there and `mail.privateemail.com` is the matching relay. It presents `CN=privateemail.com` with `mail.privateemail.com` among its SANs and verifies cleanly on both 465 and 587. Nothing is pinned, so a provider server move cannot break the send.

   ```
   supabase secrets set NEWSLETTER_SMTP_HOST=mail.privateemail.com NEWSLETTER_SMTP_PORT=465
   ```

2. **Verify against the name the certificate does carry.** Keeps `mail.sinnapi.com` as the address dialled and checks the shared server's own hostname instead. TLS stays fully verified — this selects which identity is checked, it does not skip the check.

   ```
   supabase secrets set NEWSLETTER_SMTP_SERVERNAME=premium22-3.web-hosting.com
   ```

   Read the current server name from the certificate rather than assuming it, and re-read it after any hosting migration, because this pins the send to one shared server:

   ```
   openssl s_client -connect mail.sinnapi.com:465 -servername mail.sinnapi.com </dev/null 2>/dev/null \
     | openssl x509 -noout -subject -ext subjectAltName
   ```

`SMTP_SERVERNAME` does the same job for the transactional transport (`_shared/email.ts`). Both are optional and should stay unset for any correctly-certificated relay.

A transport-level failure (DNS, TLS, AUTH, missing configuration) no longer consumes recipient retry attempts: the rows are requeued with the attempt refunded and the run stops, so a campaign waits for the fix instead of closing itself as `failed`. Sending resumes on the next cron tick once the configuration is corrected — there is no replay step.
