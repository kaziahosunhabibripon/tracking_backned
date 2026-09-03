# tracking-backend — Implementation Plan

Status: Phase 0 done. Phase 1 partial (User/RefreshToken/Affiliate only). Phase 2 core auth (register/sign-in/refresh/logout/me) built and verified live against a real Postgres. This file is the single source of truth for build order — update it as phases complete or the plan changes.

## Context

`tracking-backend` is the missing piece in the `tracking/` workspace (`tracking-super-admin-dashboard` and `traking-web` already exist, both currently backed by mock data in `tracking-super-admin-dashboard/src/config/*-data.ts`). It follows the sibling-folder convention used by `proxy/` and `masformation/` — this is its own repo, not part of a monorepo.

**Primary template:** `proxy/proxy-backend` (NestJS 11 + GraphQL code-first + Prisma + Postgres) — its _structure and conventions_ are the template, not its business logic. `masformation/masformation_backend` (TypeORM instead of Prisma) is a secondary reference only, mainly to sanity-check patterns that recur across both.

**Stack:** NestJS 11 · `@nestjs/graphql` (Apollo driver, code-first, `autoSchemaFile → src/schema.gql`) · Prisma + PostgreSQL · `@nestjs/jwt` + `passport-jwt` · bcrypt · class-validator/class-transformer · Jest · Husky + commitlint + lint-staged · ESLint + Prettier.

**Domain source of truth:** `tracking-super-admin-dashboard/src/types/*.ts` and `src/config/*-data.ts` define the real shape of every entity and resource this backend must serve. Read the relevant type/data file before modeling or building each resource — do not invent fields.

## Copy vs. fresh — file-level rule

Decided: **adapt-copy infra, write-fresh domain code.** Don't do a blanket copy-paste-then-clean pass (dead proxy-specific cruft tends to survive that); don't rewrite boilerplate from scratch either (wastes time re-deriving already-solved plumbing).

- **Adapt-copy from `proxy-backend`** (copy the file, then immediately strip anything proxy-specific before moving to the next file — not later): `common/` guards, filters, interceptors, pagination helpers, GraphQL depth/field-count limit rule; `config/` env validation + loader shape; `database/database.module.ts` + `prisma.service.ts` shape; root config (`.eslintrc`/`eslint.config`, `.prettierrc`, Husky hooks, `commitlint.config`, `lint-staged` config); `jobs/` worker process pattern (structure only, wire up in Phase 5).
- **Write fresh, using proxy-backend only as a shape reference:** every domain module (`module.ts` / `resolver.ts` / `service.ts` / `dto/` / `entities/`), the Prisma schema, auth DTOs (shape mirrors proxy-backend's `sign-in.input.ts` etc. but fields come from `tracking-super-admin-dashboard/src/types/auth.ts`).
- **Deferred, not skipped:** `CurrentUser`/`Public`/`Roles` decorators and `RolesGuard` were NOT adapt-copied in Phase 0, even though they live in proxy-backend's `common/`. They're coupled to its fixed `UserRole` enum + rank hierarchy, but the dashboard's Settings → Role tab (`RoleRecord` + `RolePermissionGroup` in `src/types/settings.ts`) is a dynamic, data-driven role/permission model, not a fixed hierarchy. Design the real guard in Phase 2 against that model — don't reuse proxy's rank-based shape.

### Gotcha hit during Phase 0 (for future reference)

The Nest 11 CLI's current default `tsconfig.json` uses `"module": "nodenext"` (proxy-backend's older scaffold used plain `"commonjs"`). Two consequences that don't show up until you actually add files:

- A type-only import used only as a parameter type in a decorated class constructor needs `import type` (isolatedModules), e.g. `GlobalExceptionFilter`'s `ErrorReporterPort`.
- A dynamic `import('./app.module')` (used in `main.ts` deliberately, so `loadAppEnv()` runs before `app.module.ts`'s own imports evaluate) must use the _emitted-JS_ extension even in a `.ts` file: `import('./app.module.js')`. Without it, nodenext's ESM-mode resolver misparses `.module` as a fake file extension and fails to resolve.

## Phase 0 — Scaffold

- [x] `nest new tracking-backend` inside `tracking/` (git repo initialized, not yet committed)
- [x] Adapt-copy plumbing per the rule above: `config/`, `common/` (errors, filters, GraphQL query-limits, pagination, monitoring — decorators/guards deferred, see above), `database/` (`database.module.ts` + `prisma.service.ts`, backed by a stub `prisma/schema.prisma` with no models yet)
- [x] Husky + commitlint + lint-staged, ESLint + Prettier (eslint.config.mjs/`.prettierrc` matched proxy-backend's; Husky hooks: pre-commit → lint-staged, commit-msg → commitlint, pre-push → typecheck + jest)
- [x] `.env.example`, env validation schema
- [x] Packages installed (see package.json — full runtime + dev list matches proxy-backend's versions, pinned to stay Nest-11-compatible; `bcrypt` native binding rebuilt manually since `npm install` skips install scripts on this machine)
- [x] `npm run typecheck`, `npm run lint:check`, `npm run build` all pass
- [x] Confirm `npm run start:dev` boots a live GraphQL server — done once `.env.local` + the `tracking_dev` Postgres database existed and Phase 2's `AuthResolver` gave the schema its first Query/Mutation fields. `/graphql` is live, `Nest application successfully started`.

## Phase 1 — Database schema (Prisma)

- [x] `User` (`UserRole`: SUPER_ADMIN/ADMIN/MANAGER/STAFF/AFFILIATE), `RefreshToken` (rotation-based sessions), `Affiliate` (fields from the `/sign-up` form only — `businessType`, `phone`, `country`, `contactMethod`, `currentPlatform`, `referralSource`, `status`) — added ahead of schedule to unblock Phase 2 Auth.
- [x] Migrated against a real local Postgres (`tracking_dev`, migration `20260901081047_init`) and verified live: `registerAffiliate` → `signIn` → `me` (cookie auth) → `refreshSession` (rotation) → `logout` all round-tripped correctly over `curl`; duplicate-email register correctly rejected (`CONFLICT`); wrong password and no-cookie `me` correctly rejected (`UNAUTHORIZED`, same message for both credential failure modes — no account enumeration).
- [ ] Rest of the schema, modeled from `tracking-super-admin-dashboard/src/types/*.ts`:
  - Identity/RBAC: `Role`, `Permission` (the dynamic Settings → Role tab system — separate from the fixed `UserRole` enum above, see the RolesGuard note in Phase 0)
  - Core domain: expand `Affiliate` with the admin-side "Add Affiliate" fields (`manager`, `companyName`, `commissionRate`, `payoutMethod`, `earning`, `convRate`), `AffiliateGroup`, `Manager`, `Advertiser`, `Offer`, `OfferApprovalRequest`, `CrExperiment`
  - Ops: `Notification`, `Invoice`, `SupportTicket`, `LoginLog`
  - Reporting: `ConversionReport`, `ClickLog`, `AffiliatePostbackLog`, `AdvertiserPostbackLog`, `AffiliateFraudReport`
  - Settings/config: `FAQ`, `SignupQuestion`, `TrackingDomain`, `OfferCategory`, `TrafficType`, `Settings` (singleton)
- [ ] `prisma/seed.ts` — convert existing `*-data.ts` mocks into real seed rows (keep them as the values, not the schema)
- [ ] Migration runs clean against a local Postgres

## Phase 2 — Auth module

Mirror `proxy-backend/src/modules/auth/` shape. Register turned out to mean the **affiliate self-registration** flow (`/sign-up` in the dashboard is an "Apply Now" form with business/phone/country fields, not a bare account form — confirmed against the actual page + `sign-in-form.tsx`/`auth-view.tsx`), so `RegisterAffiliateInput` covers those fields and creates a `User` + `Affiliate` row in one transaction.

- [x] `modules/users/` (`UsersService`: findById/findByEmail/credential-validation/hashing, `User` GraphQL entity with `password` deliberately never given a `@Field`)
- [x] `modules/affiliates/` — minimal for now (`AffiliatesService.createProfile`, GraphQL enums for business type/contact method/platform/referral source). Full CRUD + the admin "Add Affiliate" flow is still Phase 3.
- [x] `modules/auth/dto/`: `sign-in.input.ts`, `register-affiliate.input.ts`
- [x] `strategies/jwt.strategy.ts`
- [x] `guards/gql-jwt-auth.guard.ts` (simplified vs proxy-backend — no API-key auth path, not needed here), `guards/gql-throttler.guard.ts`
- [x] `cookie.service.ts` (httpOnly access + refresh cookies), `refresh-token.service.ts` (DB-backed rotation with stolen-token family revocation)
- [x] `common/decorators/{public,current-user,roles}.decorator.ts` + `common/guards/roles.guard.ts` — a **fixed** `UserRole`-rank guard (AFFILIATE < STAFF < MANAGER < ADMIN < SUPER_ADMIN), wired globally via `APP_GUARD` (order: throttle -> JWT -> roles). This is NOT the dynamic Settings → Role tab system — that's still open, see Phase 1's Role/Permission note.
- [x] Resolver mutations: `registerAffiliate`, `signIn`, `refreshSession`, `logout`; query: `me`
- [ ] `change-password.input.ts` / `request-password-reset.input.ts` / `reset-password.input.ts` — not built yet, no email-sending module exists to deliver a reset link. Add when Phase 4/5 emails are wired up.
- [x] Seed one super-admin user — `UsersService.ensureUser` (idempotent create-if-missing, never resets an existing account) + `DatabaseSeedService` + `src/database/seeds/run-seeds.ts` (boots the app via `NestFactory.createApplicationContext`, mirrors `proxy-backend`'s pattern). Reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from env, skips silently if absent. `npm run seed:run` verified live — `signIn` + `me` both confirmed `role: SUPER_ADMIN`.

## Phase 3 — Vertical slice (prove the pattern before scaling out)

Before building all remaining resource modules, take **one** resource end-to-end and wire it to the real frontend. This catches pattern mistakes while there's only one module to fix, instead of after fifteen.

- [ ] Build `Affiliates` module fully (module/resolver/service/dto/entities)
- [ ] Add Apollo Client to `tracking-super-admin-dashboard` (reuse `traking-web`'s existing setup as reference)
- [ ] Replace `affiliates-data.ts` mock import with a real GraphQL query/mutation on one page
- [ ] Confirm auth guard + role check work against a real logged-in session in the dashboard, not just Postman/GraphQL Playground

Only proceed to Phase 4 once this slice works end-to-end in the browser.

## Phase 4 — Remaining resource modules

Same module shape as the Phase 3 slice. Suggested order (dependency-ish, not strict):

1. Managers
2. Advertisers
3. Offers (+ `CrExperiment`)
4. OfferApproval
5. Notifications
6. Billing / Invoice
7. Reports (8 report types: conversion, click log, affiliate postback log, advertiser postback log, affiliate fraud report, affiliate report, advertiser report, offer report)
8. Settings sub-resources (FAQ, SignupQuestion, TrackingDomain, OfferCategory, TrafficType, network/email/preference settings, login logs, support tickets)

## Phase 5 — Cross-cutting concerns

Deliberately after core CRUD + auth are proven (Phase 3), not before — adding ops infrastructure around unstable domain code makes debugging harder, not easier.

- [ ] `ThrottlerModule` (rate-limit login specially)
- [ ] `GlobalExceptionFilter`
- [ ] Pino structured logging (redact `password`/`token`/`authorization`)
- [ ] Sentry
- [ ] Helmet
- [ ] GraphQL depth/field-count limit rule (adapt-copied in Phase 0, enable here)
- [ ] BullMQ + Redis background jobs, `worker.ts` separate process pattern from `proxy-backend`: postback delivery retry, notification fanout, scheduled reports

## Phase 6 — Full frontend integration

- [ ] `graphql-code-generator` for typed hooks
- [ ] Replace all remaining `config/*-data.ts` mock imports across `tracking-super-admin-dashboard` with generated queries/mutations
- [ ] Wire `traking-web` (public site) to any public-facing queries it needs

## Phase 7 — Testing

- [ ] Jest unit tests per service
- [ ] E2E tests with `@testcontainers/postgresql` (real ephemeral Postgres, matching `proxy-backend`'s actual approach — not mocked DB)

## Phase 8 — CI/CD & docs

- [ ] GitHub Actions: lint + typecheck + test + build
- [ ] Docker: `Dockerfile` + `docker-compose.yml` (both sibling repos already have these — match the pattern)
- [ ] `CLAUDE.md`/`AGENTS.md` for `tracking-backend`, following `proxy-backend`'s structure (its CLAUDE.md is the reference for section layout, not its content)
- [ ] Deploy: frontend stays on Vercel; backend on separate infra (Coolify/Railway/Render) + managed Postgres + Redis

## Open decisions

- [ ] Confirm exact RolesGuard permission model against the Settings → Role tab mockup before Phase 2 (what granularity: per-module, per-action, or both?)
- [ ] Confirm which report types in Phase 4.7 need real-time/near-real-time data vs. can be batch-computed (affects whether they need their own BullMQ jobs in Phase 5)
