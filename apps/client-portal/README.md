# @sinnapi/portal — Client Portal (Vite React SPA)

Authenticated portal for **Clients & Event Planners**, built as a **Vite + React
Router SPA** (no SSR/SEO — that's intentional). Users arrive by logging in from the
public website (which deep-links here), or sign in / sign up directly.

> Decided 2026-06-18: the portal is a SPA, not Next.js. The public marketing site
> stays on Next.js (it needs SEO). Separate deploy targets; shared code belongs in
> `packages/`.

## Stack
React 18 + TypeScript + Vite · React Router v6 · MUI 5 · TanStack Query ·
`@supabase/supabase-js` · Zustand · react-hook-form + Zod.

## Auth & security model
- **Supabase Auth, PKCE flow**, session persisted in browser storage + auto-refresh.
- `AuthProvider` tracks the session; `ProtectedRoute` gates the app shell and
  redirects to `/sign-in?returnTo=…` when signed out.
- All data access is **RLS-scoped** to the signed-in user — only the anon key ships.
- **Tradeoff vs httpOnly cookies:** because the session lives in browser storage,
  XSS hygiene matters more. Mitigations shipped: strict **CSP** in `index.html`
  (serve it as a real HTTP header in prod), `noindex`, no `dangerouslySetInnerHTML`.
- New sign-ups get a profile + default role via the DB trigger `handle_new_user`
  (migration `…0017`).

## Structure
```
index.html            # app entry + CSP
src/
  main.tsx            # Router + providers bootstrap
  App.tsx             # route table (public auth + protected shell)
  auth/               # AuthProvider, ProtectedRoute
  providers/          # Theme + QueryClient + Auth
  lib/                # supabase client, theme, config, status, rel helper
  hooks/queries.ts    # TanStack Query hooks over Supabase
  components/         # shell, ui, vendor, escrow, messaging, profile, event, auth
  pages/              # Dashboard, Discover, VendorDetail, Bookings(+detail),
                      # Quotations(+compare), MyEvents(+new), Messages(+thread),
                      # Payments, Escrow, Reviews, Notifications, Profile, Settings
```

## RPC-backed actions (Step 7 functions)
request quote → `request_quotation` · request booking → `create_booking` ·
confirm release → `client_confirm_release` · dispute → `open_dispute` ·
mark read → `mark_all_notifications_read`. Messages/events inserted directly under RLS.

## Run
```bash
cd apps/portal
cp .env.example .env.local   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
yarn install
yarn dev                     # http://localhost:3001
```
Set the public site's `NEXT_PUBLIC_PORTAL_URL=http://localhost:3001` so its
sign-in buttons land here. Add this SPA's URL to Supabase Auth → URL Configuration
(redirect URLs) so the PKCE callback (`/auth/callback`) is allowed.

## Production CSP
Prefer serving the CSP as an HTTP header from your host/CDN (not just the meta tag),
and lock `connect-src` to your exact Supabase project URL.
