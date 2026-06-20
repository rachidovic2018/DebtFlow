# Capital Flow — MCA CRM

An internal operations CRM for a US **merchant cash advance (MCA)** company,
built per [CLAUDE.md](CLAUDE.md). Next.js 15 (App Router) · TypeScript · Prisma +
Postgres (Neon) · Auth.js (NextAuth) · Tailwind + the in-repo design system.

> **Inferred build.** CLAUDE.md's companion spec files (`/docs/schema.prisma`
> with the exact 26 models, the four `mca-crm-*.md` docs, and `epps-scaffold/`)
> were **not present in the repo**, so the data model, every field, and the
> EPPS/DigiSigner wire formats are **reconstructed from CLAUDE.md prose**. This
> is a faithful best-effort, not a literal "exact match." Provider integrations
> run in **simulation** (`EPPS_MODE=fake`, `USE_SIMULATED_PROVIDERS=true`).

## The three hard rules (enforced throughout)

1. **An MCA is a purchase of future receivables, not a loan.** No interest rate,
   no fixed maturity. Terms are **factor rate · advance · purchased amount ·
   holdback · estimated term (an estimate)**. A compliance grep for
   `loan`/`interest`/`maturity` finds only deliberate negations.
2. **Money is integer cents stored as `BigInt`.** Converted only at the UI edge
   (`lib/money.ts`).
3. **Deal balances are derived from the append-only `LedgerEntry`, never
   stored.** The ledger moves only on confirmed EPPS settlement.

## Phase status (CLAUDE.md)

| Phase | Module | Status |
|---|---|---|
| 0–1 | Scaffold + 26-model schema + data layer + seed | ✅ |
| 2 | Auth.js + RBAC (8 roles) | ✅ (row-level visibility = TODO) |
| 3 | Brokers · Leads (Kanban) · Clients 360 · Contacts · Creditors · Applications · **state machines + transition services + AuditLog** | ✅ |
| 4 | Underwriting — feature job, versioned decisions | ✅ |
| 5 | Contracts — DigiSigner adapter, generate/send/sign, deal-on-sign | ✅ |
| 6 | **EPPS** — enrollment, scheduler, batch/sync crons, posters → ledger + `ACTIVE_CLIENT`, returns → collections | ✅ |
| 7 | Reconciliation · Collections · Renewals · Syndication | ✅ |
| 8 | Accounting — ledger view, rollups, reconciliation status | ✅ |
| 9 | Admin dashboard + most-relevant creditor/sector + snapshot cron | ✅ |
| 10 | Hardening — compliance grep, idempotency, README | ✅ (row-level RBAC + Sentry = TODO) |

## The spine

- **State machines** ([src/domain/state-machines.ts](src/domain/state-machines.ts)) +
  **transition services** ([src/lib/services/transitions.ts](src/lib/services/transitions.ts))
  are the ONLY place status changes; each writes an `AuditLog` row. Illegal
  transitions are rejected.
- **EPPS** ([src/lib/services/epps-*.ts](src/lib/services)): `scheduler` queues
  remittances → `batch` flips QUEUED→SUBMITTED → `posters` post the ledger on
  CLEARED (and promote the first-payment client to `ACTIVE_CLIENT`), open
  collections on RETURNED. Idempotent under cron retry.
- **Reconciliation** recomputes owed remittance (holdback × reported receipts)
  and credits over-collection by lowering upcoming QUEUED debits. Denials require
  a stored reason.

## Run locally

```bash
pnpm install --ignore-workspace
cp .env.example .env      # set DATABASE_URL + DIRECT_URL (Neon), NEXTAUTH_SECRET, FIELD_ENCRYPTION_KEY, CRON_SECRET
npx prisma migrate deploy
npx prisma generate
npx prisma db seed        # users (one per role), teams, brokers, creditors, clients, deals, ledger, EPPS payments
# next dev breaks inside OneDrive on Windows — use the production server:
npx next build && npx next start -p 3000
# login: admin@capitalflow.io / admin123
```

## Driving the simulated flows (no real providers)

- **Deals → "Run EPPS Cycle"** runs schedule → batch → sync; cleared payments
  move the ledger and promote first-payment clients.
- **Contracts → "Simulate Signed"** completes a signature and creates the Deal.
- Cron endpoints (`/api/cron/*`) self-authenticate via `CRON_SECRET` and are
  wired in [vercel.json](vercel.json) (EPPS windows 12:30/2:30 PM Central — the
  UTC times use the CST mapping; adjust for CDT/DST on deploy).

## Known gaps / next

- **Row-level RBAC**: helpers exist (`lib/rbac.ts`) but per-query owner/team
  filtering and field-level redaction (SSN/bank) are not yet enforced everywhere.
- **Live providers**: fill the `>>> FILL IN <<<` blocks in `lib/epps/client.ts`
  and `lib/digisigner/index.ts`, set `EPPS_MODE=live` / `USE_SIMULATED_PROVIDERS=false`.
- **Background jobs**: statement ingestion + crons run inline/simulated; move to
  Inngest/QStash for production.
- **Counsel review** of contract templates, disclosures, and collections flows
  before any go-live (CLAUDE.md §10.7).
