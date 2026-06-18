# Sinnapi — Monorepo

Event marketplace platform. Yarn workspaces + Turborepo.

## Apps
| App | Package | Stack | Dev URL |
|---|---|---|---|
| Public website | `@sinnapi/web-public` | Next.js (SSG/ISR, SEO) | http://localhost:3000 |
| Client portal | `@sinnapi/client-portal` | Vite React SPA | http://localhost:3001 |
| Vendor portal | `@sinnapi/vendor-portal` | Vite React SPA | http://localhost:3002 |
| Admin portal | `@sinnapi/admin-portal` | Vite React SPA | http://localhost:3003 |

Backend is Supabase (`supabase/` — migrations + edge functions).

## Quick start
```bash
nvm use            # Node 20 (see .nvmrc)
yarn install       # installs every workspace from the root
yarn setup:env     # creates apps/*/.env.local from each .env.example (fill in your Supabase keys)
yarn dev:all       # 🚀 runs ALL apps at once (Turborepo, prefixed output)
```
Open the four URLs above. Stop everything with `Ctrl+C`.

## Common commands (run from the repo root)
| Command | What it does |
|---|---|
| `yarn dev:all` | Start **all** apps in parallel |
| `yarn dev:web` | Public site only |
| `yarn dev:client` / `dev:vendor` / `dev:admin` | A single portal |
| `yarn dev:portals` | The three SPA portals (no public site) |
| `yarn build` | Build everything (cached by Turborepo) |
| `yarn lint` / `yarn typecheck` | Lint / type-check every app (cached) |
| `yarn clean` | Remove build artifacts (`dist`, `.next`, `.turbo`) |
| `yarn clean:deps` | Remove all `node_modules` |

### Supabase helpers (require the Supabase CLI)
| Command | What it does |
|---|---|
| `yarn db:push` | Apply migrations to the linked project |
| `yarn db:reset` | Reset the local DB and re-run migrations |
| `yarn functions:serve` | Serve edge functions locally |

## How `dev:all` works
`turbo run dev` runs each workspace's `dev` script as a parallel, persistent task and
streams their logs with a per-app prefix. Ports are fixed (3000–3003) so there are no
collisions. Each app is still runnable on its own (`cd apps/<app> && yarn dev`).

## Notes
- Public site uses `NEXT_PUBLIC_*` env vars; the SPAs use `VITE_*` (see each app's `.env.example`).
- Point the public site's `NEXT_PUBLIC_PORTAL_URL` at the client portal, and add each
  SPA's `/auth/callback` to Supabase Auth → URL Configuration.
- Shared code (theme, Supabase client, UI atoms) is currently duplicated per app and is
  the natural next step to extract into `packages/*` (already in the workspace globs).
