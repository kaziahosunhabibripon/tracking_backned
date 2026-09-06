# Tracking Backend — Current Scope

**Reviewed:** 2026-09-06 (working tree, including uncommitted Phase 7 changes)
**Companion doc:** [GAP-ANALYSIS.md](./GAP-ANALYSIS.md) — every gap referenced below is tracked there as a discrete issue (`GAP-xxx`).
**Update (same day):** 13 of the gaps referenced below (GAP-001, 003–010, 012, 014, 019–021, 027) were fixed and verified later the same day — module statuses below are pre-fix descriptions; check GAP-ANALYSIS.md for current ✅ status before treating any "GAP-xxx" mention here as still open.

## 1. What this is

A NestJS + GraphQL (Apollo) + Prisma/Postgres backend for an affiliate/offer-tracking platform: advertisers create campaigns/offers, affiliates drive clicks, conversions are attributed via S2S postbacks, and staff manage the whole pipeline plus billing, support, and content config. No frontend lives in this repo.

**Stack:** NestJS 11, Apollo GraphQL (schema-first via decorators, `src/schema.gql` generated), Prisma 6 / PostgreSQL, Passport-JWT, Pino logging, Helmet, class-validator, Jest + Testcontainers.

## 2. Cross-cutting architecture

- **Auth model:** JWT access token (short-lived) + DB-backed refresh token with rotation and reuse-detection (`RefreshToken` table, family-based revocation). Guards are **secure-by-default**: `GqlThrottlerGuard` → `GqlJwtAuthGuard` → `RolesGuard` are registered globally (`APP_GUARD` in `app.module.ts`), so every resolver requires a valid JWT unless explicitly marked `@Public()`. `@UseGuards(GqlJwtAuthGuard)` seen on individual resolvers is redundant (harmless) given this.
- **Authorization:** two decorators — `@Roles(...)` (hierarchical: STAFF ≤ MANAGER ≤ ADMIN ≤ SUPER_ADMIN, with ADVERTISER/AFFILIATE as peer tracks) and `@RolesExact(...)` (exact match, for endpoints where rank must not apply, e.g. advertiser-only or affiliate-only data). A `RolePermission` table exists for fine-grained permissions but **is not wired into the guard** — see GAP-002.
- **Validation:** global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`. This only enforces what class-validator decorators declare on a DTO — an undecorated field accepts anything. Coverage is inconsistent across modules (see GAP-016).
- **Error handling:** a single `GlobalExceptionFilter` normalizes every thrown error into a consistent GraphQL/HTTP shape, logs 5xx server-side, and reports 5xx to an optional Sentry adapter (no-op if `SENTRY_DSN` unset).
- **Rate limiting:** `@nestjs/throttler`, global default + per-mutation overrides (auth, campaign/advertiser create). Stripe's webhook path is exempted from throttling.
- **GraphQL hardening:** query depth limit (10) and field-count limit (500), introspection hard-off in production regardless of env var, playground disabled in production.

## 3. Data model

34 Prisma models across 8 domains:

| Domain              | Models                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Identity            | `User`, `RefreshToken`                                                                               |
| Affiliate           | `Affiliate`, `AffiliateGroup`, `AffiliateGroupMember`, `PaymentTerm`, `AffiliatePayment`, `Referral` |
| Advertiser/Campaign | `Advertiser`, `Campaign`, `CampaignPayout`, `CampaignCap`, `CampaignRemark`                          |
| Offer               | `Offer`, `OfferPayout`, `OfferCap`, `OfferRemark`                                                    |
| Tracking            | `Click`, `Conversion`, `AffiliatePostbackLog`, `AdvertiserPostbackLog`, `FraudCase`                  |
| Engagement          | `Notification`, `NotificationRead`, `Faq`, `SignupQuestion`, `SupportTicket`                         |
| Billing             | `Plan`, `Subscription`, `PaymentMethod`, `Invoice`                                                   |
| Platform            | `Setting`, `LoginLog`, `RolePermission`                                                              |

Full ER detail: see `DATABASE-UML-DIAGRAM.md` (pre-dates Phase 7 — needs a refresh, see GAP note below).

## 4. Module inventory

### Identity & Access

| Module               | Purpose                                                                                     | Status                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`               | Sign-in, affiliate self-registration, JWT refresh rotation w/ reuse-detection, logout, `me` | Functional. Security-critical rotation logic is **untested** (GAP-007)                                                                            |
| `users`              | Internal credential validation, password hashing, seed helper                               | **No public API** — no admin CRUD for users exists anywhere (GAP-017)                                                                             |
| `affiliates`         | Affiliate profile read (self + staff)                                                       | Functional with a real bug in the staff lookup path (GAP-005); no way to approve/reject an application (GAP-018)                                  |
| `affiliate-groups`   | Group affiliates by cohort (budget/tags), manage membership                                 | Functional; reads are unintentionally open to any authenticated user (GAP-006); no delete-group mutation                                          |
| `affiliate-payments` | Payout terms + payment records per affiliate                                                | **Broken access control** — any authenticated user can read any other affiliate's payment data (GAP-001, critical)                                |
| `referral-programs`  | Affiliate-refers-affiliate tracking                                                         | Admin-side (`createReferral`) works; both self-service queries (`myReferrals`, `myReferralStats`) are **non-functional** for real users (GAP-004) |
| `role-permissions`   | Fine-grained permission grants per role                                                     | CRUD works but **has zero effect on authorization** — not consulted anywhere (GAP-002)                                                            |
| `login-logs`         | Login attempt audit trail                                                                   | Schema + read API exist; **nothing ever writes to it** (GAP-003)                                                                                  |

### Advertiser, Campaign & Offer Management

| Module        | Purpose                                                      | Status                                                                                                                                     |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `advertisers` | Advertiser account CRUD (staff-managed)                      | Functional. Manager-level write access isn't scoped to "advertisers I manage" — needs a product decision (GAP-023)                         |
| `campaigns`   | Campaign CRUD, nested payouts/caps/remarks, status lifecycle | Functional core; a resolver-guard bug currently **locks admins out of managing any campaign** (GAP-010, contradicts the code's own intent) |
| `offers`      | Advertiser-owned offers (CPA/CPL/CPS/CPI), approval flow     | Basic CRUD + approve/reject present                                                                                                        |

### Tracking & Attribution

| Module     | Purpose                                                                                   | Status                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tracking` | Click redirect + cookie drop, S2S postback ingest (HMAC-verified, idempotent by `txn_id`) | Functional and well-tested for the core paths; some branches (campaign status/expiry checks, cap-increment side effects) aren't covered yet (GAP-029) |

### Reporting & Analytics

| Module    | Purpose                                                                                                                       | Status                                                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reports` | Admin dashboards: offers/affiliates/advertisers/conversions/clicks/postback-logs/fraud, plus overview & performance analytics | Functional. Previously flagged duplication across 8 near-identical resolver/service pairs has been **refactored into a shared `paginatedReport` helper** — resolved since the last review |

### Commerce

| Module    | Purpose                                                                     | Status                                                                                                                                                                                                                                                                                                                                 |
| --------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `billing` | Plans, subscription/invoice/payment-method read access, Stripe webhook sync | Webhook signature verification is solid. Everything else is partial: no checkout/subscribe/cancel/payment-method mutations exist despite being marked done in `plan.md` (GAP-011); `Invoice` rows can never be created, only updated (GAP-012); `Plan.features` has a GraphQL type bug that will throw on read for real data (GAP-009) |

### Engagement & Support

| Module             | Purpose                                                             | Status                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notifications`    | Broadcast + (intended) per-user in-app notifications, read tracking | Broadcast works; **per-user notifications have no data-model support and can never reach their recipient** (GAP-013)                               |
| `settings`         | Generic key/value config store                                      | Functional but two problems: no role gate on reads of what may be sensitive config (GAP-008), and the same JSON-as-String bug as billing (GAP-009) |
| `faqs`             | Admin-managed FAQ content for the public signup form                | Built, but requires a JWT — the public signup form it's meant to feed **cannot call it anonymously** (GAP-014)                                     |
| `signup-questions` | Custom signup form fields                                           | Same pre-auth gap as `faqs` (GAP-014); `options` field has a JSON/String type mismatch                                                             |
| `support-tickets`  | User-submitted tickets, staff triage                                | Functional; ownership scoping is correct; some type-safety and validation gaps                                                                     |

### Platform / Infra

| Module   | Purpose                                                              | Status                                                                                                                |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `files`  | REST multipart upload + static serving (campaign icons)              | Functional; SVG in the allowed MIME list is a stored-XSS risk on a public, unauthenticated serving endpoint (GAP-019) |
| `health` | `/health`, `/health/live`, `/health/ready` liveness/readiness probes | Clean, no issues found                                                                                                |

## 5. Test & quality infrastructure — current state

- Unit tests exist for the highest-risk logic: `ClickService`, `PostbackService`, `AuthService` — a real improvement from zero, but `AuthService`'s spec mocks out `RefreshTokenService` entirely, so **the actual rotation/reuse-detection logic has no direct test anywhere** (GAP-007).
- Integration test infra (`Testcontainers` + real ephemeral Postgres) is wired up correctly in principle, but the "Docker not available" path doesn't actually skip the test run (GAP-020) — a real safety gap for anyone running the suite without Docker.
- `npm run test:integration` was removed from `package.json` in the same change that added its own config file (GAP-021) — currently has to be invoked manually.
- No CI/CD pipeline, Docker image, or `.env.example` exist in the repo. `STRIPE_*` env vars are undocumented and unvalidated at boot (GAP-022).

## 6. Explicitly out of scope today

- No frontend (this is a backend-only repo).
- No admin UI for user management, affiliate approval, or role-permission enforcement (schema/API gaps noted above make some of this a blocker, not just "not built yet").
- No background job/queue infrastructure (webhook processing, notification delivery, refresh-token cleanup all run inline or not at all).
- No CI/CD, containerization, or observability stack beyond an optional Sentry adapter.
