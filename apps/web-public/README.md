# @sinnapi/web-public

The Sinnapi public marketing & discovery website — Next.js (App Router) + TypeScript + MUI.
Read-only, SEO-first, served to anonymous visitors. Transactional features live in the
separate authenticated portal app; public CTAs deep-link to it.

## Stack
- Next.js 14 (App Router, RSC, SSG/ISR)
- React 18 + TypeScript
- MUI 5 (Sinnapi design tokens — Amethyst/Gold)
- TanStack Query (client islands)
- Supabase JS / SSR (anon, read-only public data)
- Zod (form validation)

## Getting started
```bash
cp .env.example .env.local   # set NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
yarn install
yarn dev                     # http://localhost:3000
```
Without Supabase env vars the site still builds and renders graceful empty states.

## Structure
```
src/
  app/                 routes (App Router) — marketing, vendors, events, auth entry, SEO, error states
  components/          layout (navbar/footer), vendor, event, contact, common (Prose, EmptyState…)
  lib/
    theme.ts           MUI theme from the Sinnapi design system
    supabase/server.ts read-only anon client (null-safe when unconfigured)
    queries.ts         public read models (vendor contacts never exposed)
    config/site.ts     brand, nav, route map, formatters
    types.ts           public-facing read models
public/                placeholder media, icons
```

## Routes (Step 5 — public surface)
- Marketing: `/`, `/about`, `/mission`, `/vision`, `/story`, `/how-it-works`, `/pricing`, `/faq`, `/contact`
- Discovery: `/vendors`, `/vendors/[slug]`, `/vendors/category/[category]`, `/vendors/region/[region]`
- Events: `/events`, `/events/[id]`
- Auth entry: `/sign-in`, `/sign-up`, `/apply` (role selection → portal)
- Legal: `/terms`, `/privacy`, `/escrow-policy`, `/vendor-terms`
- SEO: `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`
- States: `loading`, `error`, `global-error`, `not-found` (404), `/maintenance`

## Rendering
- Marketing pages: SSG. Discovery/events/home: ISR (10–60 min) — trigger on-demand
  revalidation from the backend `outbox` when vendors/events/reviews change.
- Only `status='active' AND visibility='public'` vendors are ever returned; vendor
  email/phone are excluded from every query.
