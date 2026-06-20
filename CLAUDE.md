# MCA CRM — Build Instructions for Claude Code

This is the master build guide. Work through it in phases, in order. Each phase
has a goal, concrete steps, and a verification check before moving on. Do not
skip the verification checks. Commit after each phase.

The companion files (keep them in the repo root under `/docs`):
- `mca-crm-specification.md` — module/field functional spec
- `mca-crm-contracts-clients-accounting.md` — contracts, client section, dashboard, accounting
- `mca-crm-epps-integration.md` — EPPS gateway behavior + integration design
- `mca-crm-architecture-vercel.md` — Vercel/serverless architecture rules
- `schema.prisma` — the data model (26 models)
- `epps-scaffold/` — typechecked EPPS gateway + cron starter code

---

## Project context (read before building)

This is an internal operations CRM for a **US merchant cash advance (MCA)** company. Staff use it to manage leads, generate/send contracts (DigiSigner), underwrite, fund deals, service remittances through the **EPPS** payment gateway, track clients and their creditors, and run accounting + an admin dashboard.

**Three rules that override convenience everywhere:**
1. **An MCA is a purchase of future receivables, NOT a loan.** Never introduce fields/labels/UI using "loan", "interest rate", or a fixed "maturity date". Use Factor Rate, Purchased Amount, Estimated Term (labeled an estimate), Holdback. The schema already enforces this — keep it that way.
2. **Money is integer cents (`BigInt`), never floats.** Convert only at the UI edge.
3. **Balances are derived from the append-only ledger, never stored in a column. The financial ledger moves only on confirmed settlement.**

When a requested feature would violate these, stop and flag it rather than implementing it.

---

## Tech stack (fixed)
- Next.js (App Router, TypeScript) deployed on **Vercel**
- Prisma + **Postgres** (Vercel Postgres / Neon / Supabase) — pooled `DATABASE_URL` for the app, `DIRECT_URL` for migrations
- Auth.js (NextAuth) or Clerk for auth + RBAC
- zod for boundary validation
- Vercel Blob (or S3) for documents
- Vercel Cron for batch jobs
- Tailwind + shadcn/ui for UI
- DigiSigner (contracts), EPPS (payments) integrations

---

## Phase 0 — Scaffold & tooling

**Goal:** a running empty Next.js app on Vercel with CI-green typecheck/lint.

Steps:
1. `npx create-next-app@latest mca-crm --typescript --app --tailwind --eslint --src-dir=false` (App Router, no `src/`).
2. Add deps: `npm i @prisma/client zod && npm i -D prisma`.
3. Add `next-auth` (or `@clerk/nextjs`), `@vercel/blob`.
4. Set up shadcn/ui: `npx shadcn@latest init`, then add base components (button, table, card, dialog, form, badge, dropdown-menu, tabs, input, select).
5. Create `/docs` and drop all companion MD files + `schema.prisma` there.
6. Configure `tsconfig` path alias `@/*` → project root.
7. Add scripts: `"typecheck": "tsc --noEmit"`, `"db:migrate": "prisma migrate dev"`, `"db:generate": "prisma generate"`.

**Verify:** `npm run dev` serves a page; `npm run typecheck` passes; repo pushed to GitHub and connected to Vercel with a successful preview deploy.

---

## Phase 1 — Data layer

**Goal:** the full schema migrated and the Prisma client wired as a singleton.

Steps:
1. Copy `/docs/schema.prisma` to `/prisma/schema.prisma`.
2. Set `DATABASE_URL` + `DIRECT_URL` in `.env` (local) and Vercel env (use a pooled connection string for the app).
3. `npx prisma migrate dev --name init` then `npx prisma generate`.
4. Create `lib/prisma.ts` — the singleton pattern (don't instantiate PrismaClient per request):
   ```ts
   import { PrismaClient } from "@prisma/client";
   const g = globalThis as unknown as { prisma?: PrismaClient };
   export const prisma = g.prisma ?? new PrismaClient();
   if (process.env.NODE_ENV !== "production") g.prisma = prisma;
   ```
5. Add `lib/money.ts` (`toCents`, `fmtUSD`) and configure `superjson` (or a BigInt serializer) so API/Server Action responses don't throw on `BigInt`.
6. Write a `prisma/seed.ts` that creates: a few Users across roles, Teams, 2 ContractTemplates, a handful of Creditors, and 5–10 demo Clients in varied statuses with deals/transactions — enough to develop the dashboard against.

**Verify:** `npx prisma studio` shows all 26 models; seed runs; a scratch route can query `prisma.client.findMany()` and serialize without BigInt errors.

**Schema reference (the 26 models):** User, Team, Broker, Lead, Client, Contact, BankAccount, Application, UnderwritingDecision, Deal, LedgerEntry, Remittance, Reconciliation, CollectionsCase, Participation, Document, Stip, Activity, AuditLog, Creditor, CreditorRelationship, ContractTemplate, Contract, Transaction, EppsEnrollment, EppsPayment.

---

## Phase 2 — Auth & RBAC

**Goal:** login + role-gated access; sensitive fields protected.

Steps:
1. Wire Auth.js/Clerk. Map each authenticated user to a `User` row + `UserRole`.
2. Build `lib/rbac.ts`: `requireRole(roles)`, `can(user, action, resource)` helpers. Roles: ADMIN, SALES_REP, BROKER_MANAGER, UNDERWRITER, FUNDER_OPS, COLLECTIONS, SYNDICATION_MANAGER, AUDITOR_READONLY.
3. Enforce row-level visibility (owner/team) in queries — reps see their book, admins/auditors see all.
4. Field-level protection: never send `Contact.ssnEncrypted`, full bank numbers, or pricing margins to the client for roles that can't see them. Prefer querying without the field in Server Components.
5. Encryption util for at-rest sensitive fields (SSN, account/routing) — encrypt on write, decrypt only in permitted server paths.

**Verify:** a SALES_REP session cannot load another team's client; an AUDITOR session is read-only everywhere; SSN never appears in network payloads for unprivileged roles.

---

## Phase 3 — Core CRM objects & pipelines

**Goal:** CRUD + pipeline boards for the deal funnel. Use the field spec in `/docs/mca-crm-specification.md`.

Build in this order (each is a list/table view + detail page + create/edit):
1. **Broker/ISO** — onboarding, commission config, performance rollups.
2. **Lead** — capture, scoring, sales pipeline Kanban (New→Converted), convert-to-Client action.
3. **Client** (the account) — profile with the client-section fields (legal name, business info, sector, activity, creditors, total debt, client score, signed contract). See `/docs/mca-crm-contracts-clients-accounting.md` §2.
4. **Contact** — owners/guarantors with ownership %, guarantee type defaults to **performance/validity** (not absolute repayment).
5. **Creditor + CreditorRelationship** — model creditors as their own entity so the dashboard can rank them.
6. **Application** — pipeline (Submitted→Funded), stip checklist, computed metrics placeholders.
7. **Activity** timeline component reusable on every record.

Centralize all status changes:
- `domain/state-machines.ts` — allowed transitions for Application, Deal, CollectionsCase, Contract.
- `lib/services/transitions.ts` — `transitionDeal(id, to, actor, reason)` etc. The ONLY place status changes; each writes an `AuditLog` row. Never mutate status in route handlers directly.

**Verify:** can move a lead through the pipeline to a converted Client; every status change creates an AuditLog row; stip checklist gates application progress.

---

## Phase 4 — Underwriting

**Goal:** turn an Application into an UnderwritingDecision.

Steps (see `/docs/mca-crm-specification.md` underwriting section):
1. `lib/services/underwriting.ts` — given bank/processor data, compute features: avg monthly revenue, deposit volatility, negative days, avg daily balance, existing-debit (stacking) detection, revenue trend.
2. Statement ingestion is slow/external → run it as a **background job** (Inngest/QStash or a queued route), not inside the upload request. Write features back to the Application.
3. Decision form for underwriters: set approved amount, **factorRate**, **holdbackPct**, remittance frequency, estimatedTermDays (labeled estimate), conditions. Persist a versioned `UnderwritingDecision`.
4. On approval → `transition` Application to APPROVED and trigger contract generation (Phase 5).

**Verify:** uploading statements populates metrics asynchronously; an approval produces a versioned decision and advances the application.

---

## Phase 5 — Contracts (DigiSigner)

**Goal:** pick a template, prefill from CRM data, send for signature, advance on signed. See `/docs/mca-crm-contracts-clients-accounting.md` §1.

Steps:
1. `lib/digisigner/` — gateway interface + HTTP client (mirror the EPPS adapter pattern: code against an interface, isolate vendor wire format). Methods: `sendFromTemplate({ templateId, signerEmail, fields })`, `getSignedDocument(requestId)`.
2. `ContractTemplate` admin UI: register templates (store `digisignerTemplateId` + `fieldMapping` JSON mapping CRM fields → DigiSigner field_api_ids, with readOnly flags on financial/identity fields).
3. Generate flow: staff pick a template → resolve mapping → pull current Client/Deal values → create `Contract` (DRAFT) with a `mergedData` snapshot → send via DigiSigner → status SENT.
4. Webhook `app/api/webhooks/digisigner/route.ts`: on completion, pull the signed PDF to Vercel Blob, set `signedDocumentUrl` + `signedAt`, transition Contract → SIGNED, and create/advance the Deal.
5. For templates you don't have yet, generate the Word/PDF (use the docx/pdf tooling), upload to DigiSigner, register as a ContractTemplate.

Compliance: prefilled terms (factor, advance, payback, holdback) must exactly match the UnderwritingDecision; `mergedData` is the audit snapshot. No "loan"/"interest" fields in templates.

**Verify:** sending a contract prefills the right fields read-only; the signed-callback advances Contract + creates the Deal; signed PDF is stored.

---

## Phase 6 — EPPS payments (drop in the scaffold)

**Goal:** fund deals and collect remittances through EPPS's batch gateway.

Steps:
1. Copy `epps-scaffold/lib/epps/*`, `epps-scaffold/lib/services/epps-*.ts`, and the three route handlers into the app. Replace the scaffold's `lib/prisma.ts` stub with the real singleton.
2. Build the **remittance scheduler** (the upstream half not in the scaffold): a service that, for each active COLLECTING deal, creates `EppsPayment` rows in `QUEUED` for the next due date based on holdback/frequency. Run it on a daily Vercel Cron.
3. Enrollment gate: after a contract is signed, call `ensureEnrolled(clientId)` before any payment can queue. Handle the re-enroll-on-gateway-switch case.
4. Set env: `EPPS_MODE=live`, `EPPS_BASE_URL`, `EPPS_API_USER`, `EPPS_API_PASSWORD`, `CRON_SECRET`, optional `EPPS_WEBHOOK_SECRET`. Get credentials from EPPS (eppscard.com).
5. Fill the `>>> FILL IN <<<` blocks in `lib/epps/client.ts` with EPPS's documented request/response shapes; adjust `normalizeStatus()` to their codes.
6. Confirm the cron UTC↔Central(DST) timing per `vercel.json` notes. EPPS windows are 12:30/2:30 PM Central, fixed, batch-only (no real-time).

Remember: `submitDueBatch` only flips QUEUED→SUBMITTED. The ledger + accounting entries post ONLY on confirmed CLEARED settlement (in `epps-posters.ts`), which also promotes first-payment clients to ACTIVE_CLIENT. Returns open collections cases.

**Verify (use the fake client, `EPPS_MODE` unset):** seed a COLLECTING deal → scheduler creates a QUEUED payment → batch cron submits it → sync cron clears it → a LedgerEntry + CLIENT_PAYMENT Transaction appear and the client flips to ACTIVE_CLIENT. Then `forceReturn` a payment and confirm a collections case opens.

---

## Phase 7 — Reconciliation, collections, renewals, syndication

**Goal:** the servicing-side workflows.

1. **Reconciliation** (compliance-critical, make it prominent/low-friction): merchant submits actual receipts → recompute remittance (holdback % × receipts) → credit over-collection / lower upcoming QUEUED EppsPayments → audit every step → SLA timer. Denials require a stored reason.
2. **Collections** board by delinquency bucket; cases auto-open from EPPS returns (already wired in posters). Payment plans must stay receipts-based, not convert to a fixed loan schedule.
3. **Renewals**: eligible deals (e.g. >50% collected) spawn a new Application linked to the prior Deal; stacking check.
4. **Syndication**: participations on a deal, distributions.

**Verify:** a reconciliation lowers an upcoming queued debit and is fully audited; an EPPS return shows up as a collections case; a renewal creates a linked new application.

---

## Phase 8 — Accounting

**Goal:** company-wide financial view. See `/docs/mca-crm-contracts-clients-accounting.md` §4.

1. Transactions ledger view: filter by type/status/client/deal/broker/date.
2. Rollups: inflow/outflow/net by period, cash position, commissions paid, receivables vs collected.
3. Reconciliation status PENDING→CLEARED→RECONCILED against bank statements.
4. Keep `Transaction` (company books) distinct from per-deal `LedgerEntry` (payback collection); link via `dealId`.

**Verify:** a cleared EPPS debit appears as a CLIENT_PAYMENT inflow; period net matches sum of entries.

---

## Phase 9 — Admin dashboard

**Goal:** the front-page metrics. See `/docs/mca-crm-contracts-clients-accounting.md` §3.

Tiles + breakdowns: total clients by status, active portfolio balance (from ledger), total funded/collected, client score distribution + average, creditors-per-client, **most relevant creditor** (rank by client count + total balances from CreditorRelationship), **most relevant business sector** (rank by client count + funded volume).

Performance: precompute heavy rollups (score/creditor/sector rankings) on a Vercel Cron into a snapshot table; read snapshots on page load. Live counts/balances can query directly. Do NOT run every aggregation on each request.

**Verify:** dashboard loads fast against seed data; rankings update after the snapshot cron runs.

---

## Phase 10 — Hardening & launch

1. Audit log coverage: every status change + money movement writes `AuditLog` (actor, timestamp, from/to, reason).
2. Idempotency on all gateway operations; verify no double-debit under cron retry.
3. zod validation at every route/Server Action boundary.
4. Rate-limit webhooks; verify DigiSigner + EPPS signatures.
5. Error monitoring (Sentry), structured logs on cron jobs.
6. Compliance pass: grep the codebase for "loan"/"interest"/"maturity" in user-facing strings and remove; confirm reconciliation is prominent; confirm guarantees default to performance/validity; confirm disclosure-sent tracking per funding state exists; COJ off by default.
7. **Have MCA-specialized counsel review** contract templates, disclosures, and collections flows before go-live. Verify current state disclosure-law requirements for each funding state.

---

## Working agreements for Claude Code
- Commit after each phase with a clear message; keep PRs phase-scoped.
- Run `npm run typecheck` before every commit; keep it green.
- Never store money as float; never store a derived balance; never put a status mutation outside the transition services.
- When a feature seems to need a "loan term" or "interest rate", stop and ask — it's almost certainly the receivables-purchase line being crossed.
- Prefer Server Components for data fetching; Server Actions or route handlers for mutations; queue anything slow or looping over many records (Vercel functions are short-lived).
- This is a build map, not legal/financial advice. Flag compliance-sensitive choices for human + counsel review.
