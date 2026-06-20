# DebtFlow CRM — Demo

**Debt Settlement Operations Platform** — a frontend-only, client-facing sales
demo. No backend, no auth, no database — everything runs on realistic,
deterministic mock data and is ready to deploy to Vercel.

> This is the **demo**, not the production CRM. See the repo root for the
> production monorepo (`apps/`, `packages/`).

## Stack

Next.js 15 (App Router) · React 18 · TypeScript · Tailwind CSS ·
shadcn-style UI primitives · Recharts · Lucide. Design rules live in
[DESIGN.md](DESIGN.md).

## Run locally

```bash
cd demo
pnpm install --ignore-workspace   # standalone — not part of the parent pnpm workspace
pnpm dev                          # http://localhost:3100
```

(`npm install && npm run dev` works too.)

## Build

```bash
pnpm build && pnpm start
```

The build prerenders 116 static pages (all 100 client profiles included).

## Deploy to Vercel

Point Vercel at the **`demo/`** directory as the project root (Framework: Next.js).
No env vars required. It deploys as a fully static/SSG site.

## Screens

| Route | Screen |
|-------|--------|
| `/` | Executive Dashboard (KPIs, settlement & revenue charts, alerts, team) |
| `/pipeline` | 8-stage Kanban pipeline |
| `/clients` | Clients directory (live search / stage / risk filters) |
| `/clients/[id]` | Client 360 (Overview · Debts · Program · Payments · Documents · Communications · Timeline · Tasks + AI Summary) |
| `/cases` | Cases table |
| `/payments` | Payments Center (received, upcoming, failed ACH, reconciliation queue, history) |
| `/documents` | Documents Center (split list + PDF-style preview) |
| `/contracts` | Contract Center (generate, preview, DigiSigner signature timeline) |
| `/calculator` | Debt Resolution Calculator (live, with charts) |
| `/automations` | Node-based Automation Builder |
| `/reports` | Reports Center (revenue, collections, settlement, agent, case analytics) |
| `/admin` | Admin Dashboard (revenue, expenses, payroll, profit, commissions, forecast) |
| `/tasks` | Tasks board |
| `/settings` | Settings (profile, org, team, integrations, notifications, billing) |

## Mock data

Deterministic (seeded PRNG) so server and client render identically — no
hydration drift. Generated in [src/lib/mock](src/lib/mock): 100 clients,
250 debt accounts, 100 cases (~50 active), 500 payments, 25 contracts,
plus activities, tasks, and a team of agents. US names, banks, and creditors
(Chase, Capital One, Discover, Citi, Bank of America, Wells Fargo, …).
