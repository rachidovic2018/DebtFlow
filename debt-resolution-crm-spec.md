# Debt Resolution & Settlement CRM — Build Specification

> **Purpose:** This document is the authoritative build spec for an autonomous coding agent (Claude Code). It defines the data model, state machine, modules, integrations, and acceptance criteria for a Debt Resolution & Settlement CRM. Build incrementally, phase by phase. Do not skip the state-machine logic in Section 4 — it is the spine of the system.

---

## 0. Scope & Tech Stack

**What this system does:** Ingests debt-settlement leads, calculates tailored payment programs (the "Brain"), auto-generates legal contracts, executes recurring ACH payments via EPPS, and tracks post-enrollment client behavior to forecast revenue and prevent cancellations.

**Recommended stack (mirror the OpenClow stack for consistency):**

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| DB / ORM | PostgreSQL + Prisma |
| Auth | NextAuth (role-based: Admin, Agent, Affiliate) |
| UI | Tailwind + shadcn/ui |
| Background jobs / webhooks | n8n (self-hosted) or Next.js route handlers + a queue |
| e-Signature | DigiSigner API |
| Payments | EPPS (Electronic Payment Provider Services) ACH gateway |
| Hosting | Hostinger VPS |

Money is **always** stored as integer cents (`Int`), never floats. All percentages stored as basis points or `Decimal(5,4)`.

---

## 1. Data Model (Prisma Schema)

```prisma
// ---------- Identity & Attribution ----------
model Affiliate {
  id          String   @id @default(cuid())
  name        String
  source      String?              // e.g. "Uscapital"
  commissionRateBps Int            // basis points, e.g. 500 = 5%
  leads       Lead[]
  payouts     CommissionPayout[]
  createdAt   DateTime @default(now())
}

model Agent {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  role      Role     @default(AGENT)
  leads     Lead[]
}

enum Role { ADMIN AGENT AFFILIATE }

// ---------- Pipeline / Lead ----------
model Lead {
  id            String     @id @default(cuid())
  status        LeadStage  @default(LEAD)

  // Personal & Business
  fullName      String
  businessName  String?
  businessType  String?
  email         String
  phone         String

  // Financial Health
  grossRevenueCents      Int?
  personalIncomeCents    Int?
  additionalIncomeCents  Int?

  // Attribution
  leadSource    String?
  agentId       String?
  agent         Agent?     @relation(fields: [agentId], references: [id])
  affiliateId   String?
  affiliate     Affiliate? @relation(fields: [affiliateId], references: [id])

  creditors     Creditor[]
  program       Program?
  documents     Document[]
  client        Client?

  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}

enum LeadStage { LEAD QUALIFIED OFFER_PRESENTED CONTRACT_SENT ACTIVE }

// ---------- Multi-Creditor Debt Profile ----------
model Creditor {
  id                  String   @id @default(cuid())
  leadId              String
  lead                Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  name                String
  remainingBalanceCents Int
  currentPaymentCents   Int
  frequency           Frequency
}

enum Frequency { WEEKLY BIWEEKLY MONTHLY }

// ---------- The "Brain": Program Calculation ----------
model Program {
  id                    String   @id @default(cuid())
  leadId                String   @unique
  lead                  Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)

  totalDebtCents        Int      // aggregated from creditors
  termMonths            Int      // 4, 12, 36...
  paymentFrequency      Frequency
  settlementRateBps     Int      // e.g. 5700 = settle for 57% of debt

  // computed & frozen at offer time
  settlementFundCents   Int
  enrollmentFeeCents    Int
  bankingFeePerDraftCents Int    @default(5000) // $50
  totalDraftsCount      Int
  perDraftCents         Int
  clientSavingsCents    Int
  clientSavingsBps      Int

  createdAt             DateTime @default(now())
}

// ---------- Documents ----------
model Document {
  id            String        @id @default(cuid())
  leadId        String
  lead          Lead          @relation(fields: [leadId], references: [id], onDelete: Cascade)
  type          DocType
  template      String
  digiSignerId  String?
  status        DocStatus     @default(DRAFTED)
  signedUrl     String?
  createdAt     DateTime      @default(now())
}

enum DocType { SETTLEMENT_AGREEMENT ACH_AUTHORIZATION SERVICE_AGREEMENT INVOICE }
enum DocStatus { DRAFTED SENT VIEWED SIGNED }

// ---------- Client (post first-cleared-payment) ----------
model Client {
  id              String   @id @default(cuid())
  leadId          String   @unique
  lead            Lead     @relation(fields: [leadId], references: [id])

  // Bank / ACH
  bankName        String
  routingNumber   String   // encrypt at rest
  accountNumberEnc String  // encrypt at rest

  // Behavioral metrics (recomputed on each payment event)
  reliabilityScoreBps Int  @default(10000) // starts at 100%
  confidenceScore     Int  @default(0)     // months survived
  riskFlag            Boolean @default(false)

  payments        Payment[]
  alerts          Alert[]
  activatedAt     DateTime @default(now())
}

// ---------- Payment Ledger ----------
model Payment {
  id          String        @id @default(cuid())
  clientId    String
  client      Client        @relation(fields: [clientId], references: [id])
  scheduledDate DateTime
  amountCents Int
  eppsTxnId   String?
  status      PaymentStatus @default(SCHEDULED)
  createdAt   DateTime      @default(now())
}

enum PaymentStatus { SCHEDULED CLEARED NSF FAILED ACCOUNT_CLOSED }

// ---------- Alerts / Workflow Triggers ----------
model Alert {
  id        String   @id @default(cuid())
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id])
  type      String   // "NSF_3X", "AWAITING_SIGNATURE_48H", "DATE_CHANGE_EXCESSIVE"
  message   String
  resolved  Boolean  @default(false)
  createdAt DateTime @default(now())
}

model CommissionPayout {
  id          String   @id @default(cuid())
  affiliateId String
  affiliate   Affiliate @relation(fields: [affiliateId], references: [id])
  leadId      String
  amountCents Int
  paid        Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

---

## 2. The "Brain" — Calculator Logic

This is the core engine. Implement as a **pure function** (`lib/brain.ts`) so it is unit-testable and reused by both the live UI calculator and the contract generator.

**Inputs:** array of creditors, `termMonths`, `paymentFrequency`, `settlementRateBps`, `enrollmentFeeRateBps`, `bankingFeePerDraftCents`.

**Computation order:**

1. `totalDebtCents = Σ creditor.remainingBalanceCents`
2. `settlementFundCents = round(totalDebtCents × settlementRateBps / 10000)` — capital that actually pays creditors.
3. `enrollmentFeeCents = round(totalDebtCents × enrollmentFeeRateBps / 10000)`.
4. `totalDraftsCount` = derive from `termMonths` and `paymentFrequency` (monthly = termMonths; biweekly ≈ termMonths × 2.17 → use 26/yr proration; weekly ≈ termMonths × 4.33 → use 52/yr proration). Round to whole drafts.
5. `bankingFeesTotalCents = totalDraftsCount × bankingFeePerDraftCents`.
6. `programCostCents = settlementFundCents + enrollmentFeeCents + bankingFeesTotalCents` (+ legal fees if modeled).
7. `perDraftCents = ceil(programCostCents / totalDraftsCount)`.
8. `clientSavingsCents = totalDebtCents − programCostCents`; `clientSavingsBps = round(clientSavingsCents / totalDebtCents × 10000)`.

**Worked example from the video** (validate against these numbers): total debt ≈ $54,756, enrollment fee ≈ $14,756, 4-month weekly term, 57% settlement discount, ~23% net client savings. Write a unit test that reproduces this within rounding tolerance.

**Output:** a frozen `ProgramQuote` object. When the agent accepts the offer, persist it to `Program` so contract figures never drift.

---

## 3. Module Breakdown

### 3.1 Intake Engine (`/leads/new`)
Multi-step form capturing Personal & Business, Debt Profile (count of debts/creditors), Financial Health, and Program Selection. Each creditor added in repeatable slots (Creditor 1, Creditor 2…) with balance, payment, frequency. On save → create `Lead` (status `LEAD`) + nested `Creditor[]`.

### 3.2 Pipeline Board (`/pipeline`)
Drag-and-drop Kanban across `LeadStage` columns. Each card shows name, total enrolled debt, agent. Column headers show count + summed debt. Dragging updates `Lead.status` (note: status cannot be manually set to `ACTIVE` — that is system-driven, see Section 4).

### 3.3 Live Calculator (`/leads/[id]/program`)
Interactive UI bound to `lib/brain.ts`. Sliders/inputs for term, frequency, settlement %, enrollment %. Real-time fee distribution breakdown + client savings metric (used as closing tool). "Accept Offer" freezes the quote into `Program` and moves stage to `OFFER_PRESENTED`.

### 3.4 Document Automation + DigiSigner
Central template library (Settlement Agreement, ACH Authorization, Service Agreement, Invoice). Dynamic field mapping injects lead + program + bank data into templates. Generate payment schedule and append it. "Send for Signature" → DigiSigner API → store `digiSignerId`, move stage to `CONTRACT_SENT`. Status tracking via webhook: DRAFTED → SENT → VIEWED → SIGNED.

### 3.5 Invoice Generator
Sub-module to generate on-demand invoices with adjustable dates, auto-referencing Routing Number, Bank Name, Account Number, Invoice ID — no manual re-entry.

### 3.6 Client Profile (360°) (`/clients/[id]`)
- **The Vault:** archived signed docs + intake forms (compliance).
- **Live Program Tracking:** schedule progress, remaining balance.
- **Behavioral Stats:** Reliability Score + Confidence Metric.
- **Movement & Ledger:** full history of interactions, cleared payments, NSF alerts.

### 3.7 Executive Dashboard (`/dashboard`)
Reliability/risk scoring, confidence metrics, alert triggers, and Gross Collections vs. Company Revenue graphs with projected future draft volume.

---

## 4. The State Machine (CRITICAL)

The system strictly separates **prospects (Leads)** from **paying customers (Clients)**.

```
LEAD ─► QUALIFIED ─► OFFER_PRESENTED ─► CONTRACT_SENT ─► [first payment clears] ─► ACTIVE
                                                                    │
                                                          creates Client record,
                                                          removes from sales pipeline,
                                                          unlocks Client Section
```

- All stages up to and including `CONTRACT_SENT` (signed but unpaid) remain in the **Pipeline**.
- **Transition trigger:** an EPPS webhook reporting the **first** `CLEARED` payment. Only this event flips `Lead.status → ACTIVE`, creates the `Client` record, and copies the schedule into `Payment[]`.
- This transition must be **idempotent** — webhooks can fire twice. Guard with the `eppsTxnId` and a check that no `Client` already exists for the lead.
- Manual stage drags must never reach `ACTIVE`; enforce server-side.

---

## 5. Integrations

### 5.1 EPPS ACH Gateway
Bi-directional. Outbound: schedule recurring drafts. Inbound webhooks catch `CLEARED`, `NSF`, `FAILED`, `ACCOUNT_CLOSED` and update `Payment.status` in real time. Verify webhook signatures. Encrypt routing/account numbers at rest.

### 5.2 DigiSigner
Generate → send → poll/webhook for signature status → write `signedUrl` to `Document` and archive in the Vault.

### 5.3 n8n (recommended for the event glue)
Use n8n to receive EPPS/DigiSigner webhooks, normalize payloads, and call internal CRM API routes. This keeps retry logic and credential handling outside app code. (Pattern reference: webhook-processing + status-update workflows.)

---

## 6. Scoring Engine (`lib/scoring.ts`)

Recompute on every payment event:

- **Reliability Score (bps):** start 10000. On `CLEARED` nudge up toward 10000; on `NSF`/`FAILED` decrement (e.g. −1500 bps per miss, floor 0). Define exact weights as configurable constants.
- **Confidence Score:** months successfully enrolled (full successful billing cycles survived). Higher = lower cancellation risk.
- **Risk Flag:** set true when reliability drops below a threshold (e.g. 7000 bps) or on 3 consecutive NSF.

## 7. Alert Triggers

Generate `Alert` rows + agent tasks on: 3 failed ACH payments ("Needs reconciliation"), contract sent & awaiting signature > 48h, excessive client payment-date-change inquiries. Surface unresolved alerts on the Executive Dashboard.

---

## 8. Commission Engine

On lead activation (first cleared payment), compute affiliate payout from `Affiliate.commissionRateBps` against enrolled debt or enrollment fee (confirm basis with stakeholder) → create `CommissionPayout`. Provide a payouts ledger with paid/unpaid status.

---

## 9. Build Order (Phases)

1. **Phase 1** — Prisma schema + migrations + seed data.
2. **Phase 2** — `lib/brain.ts` + unit tests (validate the video's worked example).
3. **Phase 3** — Intake Engine + Creditor entry.
4. **Phase 4** — Pipeline Kanban + Live Calculator UI.
5. **Phase 5** — Document templates + DigiSigner integration + status webhooks.
6. **Phase 6** — EPPS integration + the Lead→Client state-machine transition (idempotent).
7. **Phase 7** — Client 360 profile + scoring engine + alerts.
8. **Phase 8** — Executive Dashboard + commission engine + analytics.

## 10. Acceptance Criteria

- Brain reproduces video example within rounding tolerance; all money in integer cents.
- A lead cannot become a Client without a real `CLEARED` EPPS webhook; transition is idempotent under duplicate webhooks.
- Signed documents land in the Vault and are immutable.
- NSF events decrement reliability and raise alerts/risk flags correctly.
- Routing/account numbers are encrypted at rest and never logged.
- Role-based access enforced server-side (Admin/Agent/Affiliate).

---

## 11. Security & Compliance Notes

- Encrypt PII and bank data at rest; redact in logs.
- ACH authorization must be captured and archived before any draft is scheduled (legal compliance).
- Maintain an immutable audit log of payment events and document signatures.
- Validate and sign-verify all inbound webhooks.
