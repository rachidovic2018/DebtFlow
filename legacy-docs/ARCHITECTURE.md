# DebtFlow CRM — Architecture

> Scaffolding reference. Defines the monorepo layout and where each concern
> lives. No feature code yet — see [PROJECT_SCOPE.md](PROJECT_SCOPE.md) for what
> ships in V1.

## Monorepo Layout

```
debtflow-crm/
├── apps/
│   ├── api/                  # NestJS backend (REST API, business logic)
│   │   └── src/
│   │       ├── modules/      # one folder per domain module
│   │       │   ├── auth/
│   │       │   ├── users/
│   │       │   ├── clients/
│   │       │   ├── cases/
│   │       │   ├── debt-accounts/
│   │       │   ├── programs/     # Program Calculator (standalone service)
│   │       │   ├── documents/
│   │       │   ├── contracts/
│   │       │   ├── signatures/   # Signature Adapter (DigiSigner)
│   │       │   ├── payments/
│   │       │   ├── tasks/
│   │       │   └── activities/
│   │       ├── common/       # guards, decorators, interceptors, filters
│   │       ├── config/       # env loading, validation
│   │       ├── queue/        # BullMQ processors + queue registration
│   │       ├── app.module.ts
│   │       └── main.ts
│   │
│   └── web/                  # Next.js 15 frontend (App Router)
│       └── src/
│           ├── app/          # routes (route groups per area)
│           │   ├── (auth)/
│           │   └── (dashboard)/
│           ├── components/   # shared UI
│           │   └── ui/       # shadcn/ui primitives
│           ├── lib/          # api client, auth helpers, utils
│           └── hooks/
│
├── packages/
│   ├── database/             # Prisma schema, migrations, generated client
│   │   └── prisma/
│   │       └── schema.prisma
│   ├── types/                # shared TS types/DTos used by web + api
│   └── config/               # shared tsconfig, eslint, prettier
│
├── docker/                   # Dockerfiles per app
├── docker-compose.yml        # postgres, redis, (api, web)
├── pnpm-workspace.yaml
├── turbo.json
├── package.json              # root workspace scripts
├── .env.example
└── .gitignore
```

## Service Boundaries

| Concern              | Lives in                          |
|----------------------|-----------------------------------|
| HTTP / REST          | `apps/api/src/modules/*`          |
| Business logic       | NestJS services inside each module|
| Data access          | Prisma client from `packages/database` |
| Background jobs      | `apps/api/src/queue` (BullMQ + Redis) |
| Auth / RBAC          | `apps/api/src/modules/auth` + `common/guards` |
| Frontend rendering   | `apps/web` (Next.js App Router)   |
| Shared types         | `packages/types`                  |

## Data Flow

```
Browser ──HTTP──> Next.js (web) ──REST/JSON──> NestJS (api) ──Prisma──> PostgreSQL
                                                   │
                                                   ├── Redis  (cache, BullMQ broker)
                                                   ├── BullMQ (async: webhooks, PDF gen, payment retries)
                                                   ├── S3     (documents, signed PDFs)
                                                   ├── DigiSigner (via Signature Adapter)
                                                   └── Stripe (ACH payments)
```

## Async / Queue Workloads (BullMQ)

These run off the request path:
- Contract PDF generation from templates
- DigiSigner webhook processing + signed-PDF storage
- Stripe ACH status polling + failed-payment retries
- Activity/audit log fan-out

## Conventions

- **Package manager:** pnpm workspaces + Turborepo.
- **Module isolation:** each NestJS module owns its controller, service, DTOs.
  Cross-module calls go through services, never direct repository access.
- **Database:** a single Prisma schema in `packages/database`, imported by the
  api. Migrations are the only way to change the DB.
- **Env:** every service validates its env at boot via `apps/api/src/config`.
- **Provider adapters:** external providers (DigiSigner, Stripe) sit behind an
  interface so they can be swapped without touching business logic.
```
