# @sinnapi/admin-portal — Admin Console (Vite React SPA)

Operations console for Sinnapi staff. Same stack as the client/vendor portals
(Vite + React Router SPA, MUI, TanStack Query, Supabase PKCE). Port **3003**.

## Access model
- **Sign-in only — no public sign-up.** Admin accounts are provisioned in the DB:
  assign one of the admin roles (`super_admin`, `compliance`, `finance`, `support`)
  to a profile via the **Users** or **Roles & Permissions** pages (or directly in SQL).
- `AdminProvider` loads the signed-in user's roles + permission set; `AdminGate`
  shows an **access-denied** screen to any non-admin.
- **MFA is required per Step 1 but deferred** in this first pass — wire Supabase
  MFA (AAL2) enroll/challenge later.

## Permission-gated UI (RBAC)
Nav and routes are filtered by the admin's permissions (`RequirePerm`), e.g. Finance
sees Escrow/Payouts/Refunds/Disputes/Ledger; Compliance sees Applications/Audit/
Retention/Erasure; Support sees moderation. **RLS enforces the same rules server-side**
— the UI gating is convenience, not the security boundary.

## Modules (full Step-5 admin surface)
Dashboard · Applications (+detail: transition / approve / reject) · Vendors
(suspend/activate) · Bookings · Quotations · Events (post) · Escrow (approve release)
· Payouts (approve + process via Edge Function) · Refunds (approve) · Disputes
(resolve) · Payments · Ledger · Subscriptions · Pricing Plans (edit) · Users (assign
roles) · Roles & Permissions (matrix) · Reviews moderation · Messaging moderation ·
Notification templates · Reports · Audit log · Settings · Retention · Erasure ·
Messages · Notifications.

## Privileged actions
- approve/reject vendor → `approve_vendor` / `reject_vendor` / `transition_application_status`
- escrow release → `approve_escrow_release` (maker-checker; client must confirm first)
- payouts → `approve_payout` then the **`psp-payout` Edge Function** (`VITE_FUNCTIONS_URL`)
- refunds → `approve_refund` · disputes → `resolve_dispute`
- RBAC / users / settings / plans / moderation / events → direct table writes under RLS
  (gated by `roles.manage`, `users.manage`, `settings.manage`, `moderation.manage`, etc.)

## Run
```bash
cd apps/admin-portal
cp .env.example .env.local   # VITE_SUPABASE_URL + ANON_KEY + VITE_FUNCTIONS_URL
yarn install
yarn dev                     # http://localhost:3003
```
Add `http://localhost:3003/auth/callback` to Supabase Auth → URL Configuration.
To create the first admin: sign up a normal account, then assign it `super_admin`
in the DB (`insert into user_roles ...`) — after that it can manage everyone else.
