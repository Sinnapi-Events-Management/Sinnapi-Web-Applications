Prerequisites before applying
Create these in Supabase → Vault: bank*encryption_key (bank-field crypto), and for cron functions_base_url + service_role_key. Enable extensions pgsodium/Vault, pg_cron, pg_net. Set the PSP/FX/email env vars on the functions (PESAPAL*\_, PAYPAL\_\_, FX*API_URL, EMAIL*\*, ALLOWED_ORIGINS).

Bot protection: set `TURNSTILE_SECRET` on the functions — `supabase secrets set TURNSTILE_SECRET=<widget secret>`. It is the Cloudflare Turnstile secret paired with the site key the four apps ship (`VITE_TURNSTILE_SITE_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), and `_shared/turnstile.ts` fails closed without it — `portal-sign-in`, `client-sign-up`, `vendor-application` and `send-password-reset` will refuse every anonymous request until it is set. The widget's domain list must include each portal's production hostname plus `localhost` and `127.0.0.1`, or the browser never produces a token in the first place.

**Auth → Attack Protection → "Enable Captcha protection" must stay OFF.** Turnstile is enforced one layer higher, in the Edge Functions, and a Turnstile token is single-use: `portal-sign-in` redeems it with Cloudflare before it verifies the password, so it cannot also hand the same token to GoTrue. With the dashboard setting on, every `signInWithPassword` the function makes is refused with `captcha_failed` regardless of what was typed — password sign-in dies in all three portals, and the admin profile page's re-authentication (`usePasswordChange`) starts insisting the current password is wrong. Confirmation and recovery links keep working throughout, because `verifyOtp` is not a password grant, which is what makes the fault look like "everyone forgot their password". Nothing in the four apps ever passes a `captchaToken` to GoTrue, so turning it off removes no protection. `portal-sign-in` detects this specific refusal and answers 503 with the remedy in the function logs rather than pretending the credentials were wrong.

Two design notes (non-blocking): bank numbers use pgp_sym_encrypt with a Vault-stored key (swap to native pgsodium keyrings if you prefer managed keys); and approve_escrow_release auto-creates the payout against the vendor's primary bank account — if none exists it leaves escrow at payout_approved for the vendor to add banking, rather than erroring.

Want me to generate the frontend scaffolding (monorepo workspace + shared packages) next, or pause here for you to apply and review the backend?
reply@sinnapi.com

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
