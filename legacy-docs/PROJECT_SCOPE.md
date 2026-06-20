# DebtFlow CRM — Project Scope

> **Status:** Frozen for MVP (V1)
> **Last updated:** 2026-06-11
> **Owner:** arrad.rachid@gmail.com

This document is the **single source of truth** for what is and isn't in scope.
Do not start a module that is not listed under **MVP Modules**. Anything under
**NOT in MVP** is deferred to **V2** — no exceptions without updating this file first.

---

## Product Summary

DebtFlow CRM is a debt-resolution / debt-settlement CRM. It manages the full
lifecycle from lead intake through client onboarding, case progression, program
calculation, contract signing, and payment collection.

---

## MVP Modules (V1)

These ship in V1. Build in roughly this order (matches the sprint plan).

| # | Module | Purpose |
|---|--------------------------|---------|
| 1 | **Authentication** | Login, logout, JWT + refresh tokens, session handling |
| 2 | **Users & Roles** | User CRUD, role assignment, RBAC enforcement |
| 3 | **Dashboard** | Role-aware landing view with key metrics |
| 4 | **Clients** | Client profiles: personal, employment, financial, debt portfolio |
| 5 | **Cases** | Case lifecycle, stage transitions, assignment, audit log |
| 6 | **Debt Accounts** | Individual creditor accounts tied to a client/case |
| 7 | **Program Calculator** | Core debt-resolution calculation engine (standalone service) |
| 8 | **Documents** | Upload, versioning, preview, S3-compatible storage |
| 9 | **Contracts** | Contract templates + generation from variables |
| 10 | **E-Signatures** | Signature adapter (DigiSigner), send/track/webhook/store |
| 11 | **Payments** | Payment schedule, ACH (Stripe), failures, reconciliation |
| 12 | **Tasks** | Task assignment and tracking per case/client |
| 13 | **Activities Timeline** | Chronological activity feed / audit trail |

---

## NOT in MVP — Deferred to V2

Do **not** build these in V1. Listed here so scope stays explicit.

| Module | Reason deferred |
|------------------------------|-----------------|
| **Payroll** | Internal ops feature, not core to client lifecycle |
| **AI** | Layer on top of stable data model later |
| **Advanced Reporting** | MVP ships basic dashboard only |
| **Open Banking Monitoring** | Heavy integration; not needed to transact |
| **Commission Engine** | Depends on stable payments + sales data first |

---

## Roles (RBAC)

The following roles are defined in V1 and gate access across all modules:

- Super Admin
- Admin
- Sales Manager
- Sales Agent
- Case Manager
- Negotiator
- Accounting
- Compliance

---

## Case Stages

Cases move through these stages (forward and audited transitions only):

1. Lead
2. Qualified
3. Offer Presented
4. Contract Sent
5. Contract Signed
6. Active Program
7. Settlement
8. Completed

---

## Tech Stack (locked)

**Frontend**
- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui

**Backend**
- NestJS
- TypeScript

**Database**
- PostgreSQL
- Prisma

**Infrastructure**
- Docker
- Redis
- BullMQ
- S3-compatible object storage

**Third-party integrations**
- DigiSigner (e-signatures, behind a swappable Signature Adapter)
- Stripe (ACH payments)

---

## Core Data Entities

The Prisma schema (built in the next step) covers:

`Users`, `Roles`, `Permissions`, `Clients`, `Cases`, `DebtAccounts`,
`Programs`, `Payments`, `Documents`, `ContractTemplates`, `Contracts`,
`Tasks`, `Activities`.

---

## Program Calculator — Contract

The calculator is a **standalone, pure service** (no UI coupling).

**Inputs**
- Total Debt
- Settlement %
- Company Fee %
- Bank Fee %
- Program Duration

**Outputs**
- Settlement Amount
- Monthly Draft
- Biweekly Draft
- Total Revenue
- Net Revenue
- Savings

---

## Signature Adapter — Architecture

```
CRM
 ↓
Signature Adapter (provider-agnostic interface)
 ↓
DigiSigner (current provider)
```

The adapter abstracts the provider so V2 can switch to DocuSign, Dropbox Sign,
or PandaDoc without touching CRM business logic.

Adapter responsibilities: Send Contract · Track Status · Receive Webhooks ·
Store Signed PDF.

---

## Definition of Done (per module)

A module is "done" only when:
- Backend endpoints exist with RBAC enforced
- Prisma models + migrations are committed
- Frontend screens are wired to real APIs
- Core flow works end-to-end (no mocked happy path)
