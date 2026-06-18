# @sinnapi/vendor-portal — Vendor Portal (Vite React SPA)

Authenticated portal for **Vendors**. Same stack and security model as the client
portal — a Vite + React Router SPA talking directly to Supabase with RLS as the
boundary. Port **3002**.

## Auth & vendor context
- Supabase Auth (PKCE), `AuthProvider` + `ProtectedRoute` gate the shell.
- `VendorProvider` loads the signed-in user's **vendor record** + **subscription**
  once and shares them. `VendorGate` unlocks feature pages only when an approved
  vendor exists; otherwise it routes to onboarding.
- Subscription state (trial / grace / expired) shows as a banner in `AppShell`;
  it does **not** hard-block — active bookings continue per the business rules.

## Pages (full Step-5 vendor surface)
Dashboard · Onboarding (application status) · Subscription (plan picker) ·
Business Profile · Services · Portfolio (plan-limited) · Calendar & availability ·
Bookings (+detail: accept / decline / complete) · Quotations (+detail: builder) ·
Templates · Public Events (express interest) · Escrow (read-only) · Payouts ·
Promotions · Discounts · Reviews (respond) · Analytics (plan-gated) ·
Messages (+thread) · Notifications · Settings (account + payout bank account).

## RPC-backed actions
respond/complete booking → `respond_booking` / `complete_booking` ·
send quote → `send_quotation` · choose plan → `choose_subscription_plan` ·
respond to review → `respond_to_review` · save bank account → `set_vendor_bank_account`
(encrypts server-side). Services, media, availability, blocked dates, promotions,
discounts, templates, and event interest are written directly under RLS.

## Run
```bash
cd apps/vendor-portal
cp .env.example .env.local   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
yarn install
yarn dev                     # http://localhost:3002
```
Add `http://localhost:3002/auth/callback` to Supabase Auth → URL Configuration.

## Notes
- Vendor accounts are created through the **vendor application** flow (public site)
  and approved by an admin (`approve_vendor`), which creates the vendor + trial
  subscription. This portal manages the business after approval.
- Same CSP / XSS hygiene as the client portal (browser-stored session tradeoff).
