# Tracking Backend — Gap Analysis

**Reviewed:** 2026-09-06 (working tree, including uncommitted Phase 7 changes)
**Companion doc:** [CURRENT-SCOPE.md](./CURRENT-SCOPE.md)

Each gap below is written as a standalone issue (`GAP-xxx`) — title, severity, evidence, impact, and a recommended fix — so any of them can be copy-pasted directly into GitHub Issues or a tracker. Severity is about **exploitability/functional impact**, not effort to fix.

Legend: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low · ✅ Resolved

**Update (2026-09-06, same day):** GAP-001 (fixed by Kilo, verified), 003, 004, 005, 006, 007, 008, 009, 010, 012, 014, 019, 020, 021, and 027 are now fixed and verified (typecheck, lint, full test suite, and a real app boot with `npm run start` against a local Postgres all pass — the app previously failed to boot at all due to a missing module import introduced by the GAP-001 fix, also caught and fixed here). Remaining open: GAP-002, 011, 013, 016–018, 022–026, 028–034 — see notes on each for why they were deferred (schema migration required, or a product/architecture decision needed, or a genuinely large feature build).

**Update (2026-09-13):** GAP-013 (per-user notification recipient — schema migration applied, service logic rewritten, tested, verified with a real app boot) and GAP-016 (input validation — done across 13 modules, a superset of the 7 listed: also offers, notifications, billing, settings, cr-optimizer) are now resolved. GAP-002 resolved via the documented fallback option — `RolesGuard` still doesn't read `RolePermission` (that still needs a real product decision), but the module, its 4 queries/mutations, and the guard itself now carry explicit GraphQL descriptions and code comments saying so, so it can no longer be mistaken for working. Also fixed in this pass, found during unrelated work rather than by a review: a SQL-injection vector in 3 reports services (`overview`/`top-campaigns`/`performance` — `advertiserId` was interpolated into `Prisma.raw()`), a broken `RolesGuard`/`@CurrentUser()` auth-context bug on REST routes, and a refresh-token leak into the GraphQL JSON response body (`AuthPayload.refreshToken` was a queryable field alongside the httpOnly cookie).

---

## 🔴 Critical

### GAP-001 — Broken access control (IDOR) on affiliate payment data ✅ RESOLVED

**Module:** `affiliate-payments`
**Evidence:** `src/modules/affiliate-payments/affiliate-payments.resolver.ts` — `payments(affiliateId?, status?)` and `paymentTerms(affiliateId?)` are guarded only by `@UseGuards(GqlJwtAuthGuard)`, with no `@RolesExact`/`@Roles`. Every mutation in the same resolver correctly restricts to staff roles.
**Impact:** Any authenticated user — including a plain `AFFILIATE` — can pass an arbitrary `affiliateId` and read another affiliate's payment amount, status, transaction ID, payout method, and minimum-payout terms.
**Fix:** Add `@RolesExact(SUPER_ADMIN, ADMIN, MANAGER, STAFF)` for the "any affiliate" case, or split into a staff-only query plus a separate self-scoped `myPayments`/`myPaymentTerms` that ignores the caller-supplied `affiliateId` and uses `@CurrentUser()` instead — matching the pattern already used correctly in `support-tickets` and `referral-programs`.

### GAP-009 — `Json` fields typed as GraphQL `String` will throw on real data ✅ RESOLVED

**Modules:** `settings`, `billing`
**Evidence:** `Setting.value` and `Plan.features` are Prisma `Json` columns, but `setting.entity.ts` / `billing.entity.ts` and their input DTOs declare `@Field(() => String)`. `src/schema.gql` bakes this in literally (`value: String!`, `features: String!`).
**Impact:** Any setting or plan whose value is a real JSON object/array/number/boolean (the entire point of these fields) throws Apollo's `GraphQLString` serializer error on read. The public pricing page (`plans`/`plan`/`mySubscription`) and any non-trivial settings read are likely broken today.
**Fix:** Add a `GraphQLJSON` scalar (e.g. `graphql-type-json`) and use `@Field(() => GraphQLJSON)` on both the entity and input types.

---

## 🟠 High

### GAP-002 — `role-permissions` CRUD has zero effect on authorization ✅ RESOLVED (via labeling)

**Module:** `role-permissions`
**Evidence:** `src/common/guards/roles.guard.ts` only ever reads the `ROLE_RANK` map and `@Roles`/`@RolesExact` decorator metadata. Repo-wide grep confirms `RolePermission` is referenced only inside the `role-permissions` module and its own migration/schema — never inside the guard or any other resolver.
**Impact:** Granting or revoking a "permission" via `createRolePermission`/`deleteRolePermission` does nothing to what any user can actually do. This can be mistaken for a working fine-grained permission system by anyone (dev or admin) who doesn't read the guard code.
**Fix:** Either wire `RolePermission` lookups into `RolesGuard` (real feature) or remove/clearly label the module as unimplemented until it is.
**Resolution (2026-09-13):** Took the labeling option, not the wiring option — `RolesGuard` genuinely still doesn't read this table. Real enforcement needs a product decision first (permission string format; additive-to vs. replacement-of the existing `@Roles`/`@RolesExact` rank system; which endpoints it should even apply to) that shouldn't be made unilaterally. Added GraphQL `description`s to the entity and all 4 queries/mutations, plus code comments on the entity, resolver, and `roles.guard.ts` itself, all stating plainly that this CRUD has no runtime effect yet.

### GAP-003 — Login audit trail never receives writes ✅ RESOLVED

**Module:** `login-logs`
**Evidence:** `LoginLogsService.record()` (`login-logs.service.ts`) is never called anywhere in the codebase. `AuthModule` does not import `LoginLogsModule`; `AuthService`/`AuthResolver`/`UsersService` never reference it.
**Impact:** `myLoginLogs`/`loginLogs` return empty forever. No way to observe brute-force attempts, credential stuffing, or a compromised account's login history — despite the schema/API existing for exactly that.
**Fix:** Call `LoginLogsService.record()` from `AuthService.signIn` (both success and failure paths) and from `AuthResolver`'s error handling.

### GAP-004 — Referral self-service queries use the wrong ID and never work ✅ RESOLVED

**Module:** `referral-programs`
**Evidence:** `myReferrals`/`myReferralStats` pass `user.sub` (a `User.id`) directly as an `Affiliate.id` into `findByReferrer`/`stats`. `Referral.referrerId` and `Affiliate.id` are a different UUID namespace from `User.id`.
**Impact:** Both queries return empty/zeroed results for every real affiliate — the feature is non-functional end to end.
**Fix:** Resolve the caller's `Affiliate.id` via `AffiliatesService.findByUserId(user.sub)` before calling into `ReferralProgramsService`.

### GAP-005 — Staff-facing `affiliate(id)` query silently expects the wrong ID ✅ RESOLVED

**Module:** `affiliates`
**Evidence:** `affiliate(id: String!)` calls `findByUserId(id)`, i.e. it expects a `User.id`. The sibling `affiliates` list query returns objects whose `id` is `Affiliate.id`. Same field name, two different meanings.
**Impact:** Any consumer that takes an `id` from the `affiliates` list and passes it to `affiliate(id)` gets `null` back. Will confuse/break any admin-panel implementation built against this API.
**Fix:** Rename the argument to `userId` for clarity, or change the resolver to call `findById` (matching the field name's obvious meaning) and add a separate lookup if the by-user-id case is still needed.

### GAP-006 — Affiliate group budget/tags readable by any authenticated user ✅ RESOLVED

**Module:** `affiliate-groups`
**Evidence:** `affiliateGroups`/`affiliateGroup` queries have `@UseGuards(GqlJwtAuthGuard)` only, no role check, while every mutation on the same resolver correctly requires staff roles.
**Impact:** Any logged-in affiliate can list every group's internal budget and tags.
**Fix:** Add `@RolesExact(SUPER_ADMIN, ADMIN, MANAGER, STAFF)` to both read queries.

### GAP-007 — Refresh-token rotation/reuse-detection has no real test coverage ✅ RESOLVED

**Module:** `auth`
**Evidence:** `auth.service.spec.ts` mocks `RefreshTokenService` completely (`{ issue: jest.fn(), rotate: jest.fn(), revokeByRawToken: jest.fn() }`). There is no `refresh-token.service.spec.ts` anywhere in the repo.
**Impact:** The single most security-critical mechanism in the auth domain — stolen-refresh-token detection via family revocation — has zero direct test coverage. A regression here would ship silently.
**Fix:** Add `refresh-token.service.spec.ts` covering: normal rotation, reuse-detection (presenting an already-rotated token revokes the family and throws), expired-token rejection, and `revokeAllForUser`.

### GAP-008 — Settings read with no role restriction ✅ RESOLVED

**Module:** `settings`
**Evidence:** `settings`/`setting` queries have `@UseGuards(GqlJwtAuthGuard)` only, no role check.
**Impact:** Depending on what gets stored under the `network`/`system`/`email` key groups described in `plan.md` (plausibly SMTP or payment config), any authenticated user of any role can read it.
**Fix:** Add `@RolesExact(SUPER_ADMIN, ADMIN, MANAGER, STAFF)` unless a specific key range is meant to be user-visible (e.g. feature flags) — if so, split into a public-safe subset and an admin-only full read.

### GAP-010 — Campaign write mutations lock out admins, contradicting the resolver's own logic ✅ RESOLVED

**Module:** `campaigns`
**Evidence:** `campaigns.resolver.ts` — `updateCampaign`, `toggleCampaignStatus`, `softDeleteCampaign` are decorated `@RolesExact(UserRole.ADVERTISER)` only. Per `RolesGuard`, an exact-role gate with no accompanying `@Roles(...)` rejects every other role before the resolver body runs. But the resolver body's own `assertCanWrite()` explicitly allows `SUPER_ADMIN`/`ADMIN` — code that can never execute.
**Impact:** A SUPER_ADMIN/ADMIN gets a 403 attempting to moderate or fix any campaign — there is currently no way for staff to intervene on a campaign at all, despite the code being written with that intent.
**Fix:** Change the decorator to `@RolesExact(UserRole.ADVERTISER, UserRole.ADMIN, UserRole.SUPER_ADMIN)` (or add `@Roles(UserRole.ADMIN)` alongside) so the existing `assertCanWrite` logic actually gets to run.

### GAP-011 — Billing subscription/payment-method mutations don't exist

**Module:** `billing`
**Evidence:** `plan.md` checks off subscription (current/change/cancel) and payment-methods (list/add/delete/set-default) as done. Repo-wide grep for `cancelSubscription`, `changePlan`, `checkoutSession`, `addPaymentMethod`, etc. returns zero matches. Only `createPlan`/`updatePlan` (staff-only) exist.
**Impact:** No user can actually subscribe, change plan, cancel, or manage a payment method through this API today — every `Subscription`/`PaymentMethod` row can only be written by the Stripe webhook, meaning nothing can create the initial state either.
**Fix:** Either implement Stripe Checkout session creation + a customer portal / cancel mutation, or correct `plan.md` to reflect actual status so the gap isn't hidden from planning.

### GAP-012 — Invoices can never be created, only updated ✅ RESOLVED

**Module:** `billing`
**Evidence:** `stripe-webhook.controller.ts`'s `handleInvoicePaymentSucceeded`/`Failed` both use `prisma.invoice.updateMany(...)`, which is a no-op with no matching row. No handler creates an `Invoice` row (no `invoice.created`/`invoice.finalized` handler with an `upsert`). Both handlers also extract `subscriptionId` and early-return `if (!subscriptionId) return;` (lines 148-149, 163-164) — but the `updateMany` that follows filters only by `stripeInvoiceId`, never using `subscriptionId` at all, so that guard doesn't do what it appears to (verified 2026-09-06: confirmed by direct read, not just the audit agent's report).
**Impact:** `myInvoices` will return empty forever for real Stripe-driven subscriptions.
**Fix:** Add a handler for the invoice-creation event that `upsert`s by `stripeInvoiceId`, or switch the existing handlers to `upsert`.

### GAP-013 — Per-user notifications have no data path to their recipient ✅ RESOLVED

**Module:** `notifications`
**Evidence:** `Notification` has only a `broadcast: Boolean` flag, no target-user field. `CreateNotificationInput` has no `userId`/`recipientIds`. `findAll`'s non-unread branch requires a `NotificationRead` row to already exist before a notification shows up at all.
**Impact:** A "personal" (`broadcast: false`) notification can never be delivered/seen by its intended recipient — the feature is non-functional despite `plan.md` marking "broadcast + per-user" as done.
**Fix:** Add a recipient relation (either a `userId` column for 1:1, or a join table for multi-recipient) and have `create()` populate it.
**Resolution (2026-09-13):** Added a nullable `Notification.userId` FK (migration `20260913105652_add_notification_recipient`). `create()` now requires either `broadcast: true` or a `userId`. Also fixed a related latent bug while rewriting this: unread counting previously only counted notifications that already had a `NotificationRead` row, so anything never touched — the common case — silently didn't count as unread; `findUnreadCount`/`markAllRead` now compute visibility (broadcast OR own) directly instead. Covered by a new `notifications.service.spec.ts` (this logic had zero test coverage before).

### GAP-014 — Pre-auth content (FAQs, signup questions, plans) requires a JWT ✅ RESOLVED

**Modules:** `faqs`, `signup-questions`, `billing`
**Evidence:** `faqs`/`faq`, `signupQuestions`/`signupQuestion`, and `plans`/`plan` all sit behind the default `GqlJwtAuthGuard` with no `@Public()` override.
**Impact:** `plan.md` explicitly describes these as feeding the public signup form and pricing page — an anonymous visitor cannot load any of them, breaking the intended flow before a user even has an account.
**Fix:** Add `@Public()` to these specific read queries (writes should stay staff-gated as they already are).

### GAP-019 — SVG in the file-upload allowlist is a stored-XSS vector ✅ RESOLVED

**Module:** `files`
**Evidence:** `image/svg+xml` is in `files.service.ts`'s MIME allowlist. `GET /files/:name` is `@Public()` and serves the file directly with no forced `Content-Disposition: attachment` and no sanitization.
**Impact:** An SVG can embed `<script>`/event-handler payloads. Any advertiser/admin able to upload one gets it served and rendered in-browser under this origin to anyone who opens the link — a classic stored-XSS path.
**Fix:** Drop `svg+xml` from the allowlist, or sanitize on upload (strip `<script>`/event handlers) and serve with `Content-Disposition: attachment` plus a strict `Content-Security-Policy` on the response.

### GAP-020 — Integration test's "Docker unavailable" path doesn't skip ✅ RESOLVED

**Module:** test infra
**Evidence:** `tracking-e2e.integration-spec.ts`'s `beforeAll` logs and returns on the `SKIP_INTEGRATION_TESTS` sentinel, but `beforeEach` unconditionally compiles `AppModule`/`app.init()` regardless.
**Impact:** On a machine without Docker, the suite either hangs/throws, or — worse — silently connects to whatever `DATABASE_URL` is already set (e.g. a real dev database) and runs a mutating flow (creates a campaign, posts a bad-signature postback) against it.
**Fix:** Add a `test.skip`/early-return guard inside each `it()` (or wrap the whole `describe` conditionally) keyed off the same sentinel used in `beforeAll`.

---

## 🟡 Medium

### GAP-015 _(reserved — folded into GAP-014, kept for numbering continuity)_

### GAP-016 — Missing input validation across several new modules ✅ RESOLVED

**Modules:** `affiliate-groups`, `affiliate-payments`, `referral-programs`, `role-permissions`, `faqs`, `signup-questions`, `support-tickets`
**Evidence:** None of these modules' DTOs carry class-validator decorators, unlike `auth`/`campaigns`/`advertisers` (which use dozens). Since the global `ValidationPipe` only enforces declared constraints, undecorated fields accept anything — empty strings, negative numbers, non-numeric text into `Decimal` fields, self-referential IDs, etc.
**Impact:** Bad data reaches Prisma and fails with opaque, unfriendly errors instead of clean 400-style GraphQL validation errors — or in some cases (e.g. `referrerId === referredId`) is accepted outright with no error at all.
**Fix:** Add `@IsUUID`/`@IsNotEmpty`/`@IsNumberString`/`@MaxLength` etc. to bring these DTOs to parity with the rest of the codebase. This is mechanical, high-value, low-risk work — a good first PR.
**Resolution (2026-09-13):** Done across all 7 listed modules, plus `offers`, `notifications`, `billing`, `settings`, `cr-optimizer` (13 total). Alongside this, `findOne`/`update`/`delete`-style methods across these modules now throw typed `NotFoundException`/`ConflictException` instead of returning `null` silently or leaking a raw Prisma `P2025`/`P2002` error as an opaque 500 (the same review that flagged this also flagged that as a separate, related gap not in the original GAP-xxx numbering).

### GAP-017 — No admin CRUD for users ✅ RESOLVED

**Module:** `users`
**Evidence:** `users.module.ts` declares only `UsersService`; no `UsersResolver` exists anywhere in the repo.
**Impact:** There is no way to list, search, deactivate, or change a user's role through the API — a functional gap for any admin panel.
**Fix:** Add a staff-only `UsersResolver` (list/search/deactivate/change-role), reusing the existing `UsersService`.
**Resolution (2026-09-13):** Added `UsersResolver`: `users(filter)` (STAFF+), `setUserActive` (ADMIN+), `changeUserRole` (SUPER_ADMIN only — deliberately tighter, since it's the one that can grant/revoke SUPER_ADMIN itself).

### GAP-018 — No mutation to change affiliate application status ✅ RESOLVED

**Module:** `affiliates`
**Evidence:** Every affiliate is created `PENDING` (`auth.service.ts`); grep for `AffiliateStatus.` and `affiliate.update` shows only the seed script and registration path ever write it.
**Impact:** An affiliate application can never be approved, rejected, or suspended through the API.
**Fix:** Add a staff-only `updateAffiliateStatus` mutation.
**Resolution (2026-09-13):** Added, gated the same as the existing `affiliate`/`affiliates` read queries on this resolver (STAFF+).

### GAP-022 — Stripe env vars undocumented and unvalidated at boot ✅ RESOLVED

**Module:** config / `billing`
**Evidence:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_PATH` are mentioned in `plan.md` but absent from `src/config/env.validation.ts`'s required-keys list, and there's no `.env.example` anywhere in the repo. `STRIPE_SECRET_KEY` is checked ad hoc in the webhook controller's constructor (throws a plain `Error`); `STRIPE_WEBHOOK_SECRET` is only checked per-request.
**Impact:** A misconfigured deploy boots cleanly and only fails the first time a real webhook arrives — a production surprise instead of a boot-time failure.
**Fix:** Add the Stripe keys to `env.validation.ts` (at least `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` if billing is enabled), and add a `.env.example`.
**Resolution (2026-09-13):** `.env.example` already existed by this point (added sometime after this doc was originally written). Added a boot-time check: exactly one of `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` set (not both, not neither) now throws — billing stays fully optional only when both are unset.

### GAP-023 — Manager write access to advertisers isn't scoped to "advertisers I manage" ✅ RESOLVED

**Module:** `advertisers`
**Evidence:** `updateAdvertiser`/`softDeleteAdvertiser` are gated `@Roles(SUPER_ADMIN, ADMIN, MANAGER)` with no check against `Advertiser.managerId`.
**Impact:** Any MANAGER can edit or deactivate any advertiser, not just ones assigned to them. May be intentional (managers are trusted staff) — flagging because every other "manager"-shaped relationship in the schema (`managerId`) suggests scoping was intended somewhere.
**Fix:** Needs a product decision: confirm whether manager-level access should be scoped, and if so add an ownership check mirroring `campaigns.resolver.ts`'s `assertCanWrite` pattern.
**Resolution (2026-09-13):** Decided scoping was intended (the whole reason `managerId` exists), not the "managers are fully trusted" alternative. Added `assertCanWrite()` to `AdvertisersResolver.update()`, matching `CampaignsResolver`'s pattern exactly: SUPER_ADMIN/ADMIN bypass, MANAGER only on advertisers where `managerId` is their own id. `softDeleteAdvertiser` needed no change — MANAGER was never in its `@Roles` list. `createAdvertiser` deliberately left alone: a MANAGER assigning an arbitrary `managerId` while creating a _new_ advertiser is a different question this gap's evidence never raised.

### GAP-024 — Advertiser/Campaign soft-delete overloads the status enum ✅ RESOLVED

**Modules:** `advertisers`, `campaigns`
**Evidence:** `softDelete` sets `Advertiser.status = 'INACTIVE'` and `Campaign.status = 'EXPIRED'`. Neither model has a `deletedAt`/`isDeleted` column.
**Impact:** A genuinely time-expired campaign and an admin-deleted campaign become indistinguishable — any "expired campaigns" report will silently include deleted ones, and there's no way to distinguish "advertiser deactivated themselves" from "advertiser was removed" in `INACTIVE`.
**Fix:** Add a real `deletedAt: DateTime?` column to both models and filter on it explicitly, keeping `status` for its actual lifecycle meaning.
**Resolution (2026-09-13):** Added the column (migration `add_soft_delete_timestamps`) and set it in `softDelete()` alongside the existing status change. Deliberately did _not_ retrofit every list/report query to filter on it — that's a UX/reporting-visibility decision (should a deleted advertiser vanish from staff's list entirely, or stay visible with a badge? should historical reports include deleted campaigns' clicks/conversions?) better made when a concrete report/screen needs it, not guessed at here. This is purely additive: no existing query's results changed.

### GAP-025 — Stripe webhook has no idempotency ledger for event ordering ✅ RESOLVED

**Module:** `billing`
**Evidence:** Handlers are idempotent for exact-duplicate delivery (upsert/updateMany keyed by Stripe IDs) but there's no stored record of processed `event.id`s or check of `event.created` ordering.
**Impact:** Stripe doesn't guarantee in-order delivery; an out-of-order `customer.subscription.updated` could overwrite newer state with stale data. No way to inspect/replay a specific failed webhook later either.
**Fix:** Add a `WebhookEvent` table keyed by Stripe `event.id`, and compare `event.created` before applying an update.
**Resolution (2026-09-13):** Added `WebhookEvent` (migration `add_webhook_event_ledger`), keyed by `event.id` plus an `objectId` (the Stripe subscription id the event pertains to) and `eventCreatedAt`. `handleWebhook` now short-circuits an already-processed `event.id`, and for subscription/invoice events, skips applying one that's older than an already-recorded event for the same object.

### GAP-026 — `support-tickets` update payload typed `any`; `assigneeId` unvalidated ✅ RESOLVED

**Module:** `support-tickets`
**Evidence:** `SupportTicketsService.update`'s `data` parameter is explicitly `any`. `assigneeId` accepts any string with no check that it references an existing (staff) user, and there's no DB-level FK either.
**Impact:** Loses type safety on the Prisma update payload; a ticket can be "assigned" to a garbage ID with no error.
**Fix:** Type `data` as `Prisma.SupportTicketUpdateInput`; validate `assigneeId` against `UsersService` (and consider a real FK once the repo-wide FK-to-User convention is addressed, see GAP-030).
**Resolution (2026-09-13):** `data` retyped; added `assertAssignable()` checking the target user exists and has a staff role, called when `assigneeId` is being set (not when clearing to `null`). The FK-to-User part is still open — see GAP-030.

### GAP-027 — `signup-questions.options` JSON/String type mismatch ✅ RESOLVED

**Module:** `signup-questions`
**Evidence:** `options` is declared `@Field(() => String) options?: any` while the Prisma column is `Json?` — same family of bug as GAP-009.
**Impact:** A client sending a structured object (the natural shape for multiple-choice options) is rejected at the GraphQL layer.
**Fix:** Same as GAP-009 — use a JSON scalar.

### GAP-028 — Refresh tokens have no expiry/cleanup job ✅ RESOLVED

**Module:** `auth`
**Evidence:** No cron/scheduled sweep of expired or revoked `RefreshToken` rows exists anywhere in the repo.
**Impact:** The table grows unbounded forever — every login and every rotation adds a row that's never removed.
**Fix:** Add a scheduled job (e.g. `@nestjs/schedule` cron) that deletes rows past `expiresAt` (and optionally revoked rows older than some retention window).
**Resolution (2026-09-13):** Added `@nestjs/schedule`, registered `ScheduleModule.forRoot()`, and a daily `@Cron` job on `RefreshTokenService` deleting expired rows and revoked rows past a 30-day retention window. `@nestjs/schedule` ships ESM-only, which broke Jest for every spec transitively importing this service until a `transformIgnorePatterns` entry was added.

### GAP-029 — Tracking unit tests don't cover all branches ✅ RESOLVED

**Module:** `tracking`
**Evidence:** `click.service.spec.ts` doesn't test the "campaign not ACTIVE/PAUSED" or "campaign expired" rejection branches, or the `isUnique` dedup logic itself. `postback.service.spec.ts`'s happy-path test doesn't assert the `campaignCap.updateMany` call actually happened inside the transaction.
**Impact:** Real business-rule branches ship without a regression net.
**Fix:** Add the missing cases — this is incremental work on an already-good foundation, not a rewrite.
**Resolution (2026-09-13):** Added all four missing cases.

### GAP-021 — `test:integration` npm script removed while its config was added ✅ RESOLVED

**Module:** config
**Evidence:** `test/jest-integration.json` and `test/tracking-e2e.integration-spec.ts` are new, but the `"test:integration"` script that would run them was deleted from `package.json` in the same change.
**Impact:** No documented way to run the integration suite; looks like an accidental merge/edit artifact.
**Fix:** Restore `"test:integration": "jest --config ./test/jest-integration.json --runInBand"`.

---

## ⚪ Low

### GAP-030 — Systemic lack of FK constraints to `User` ✅ RESOLVED

**Modules:** `support-tickets`, `login-logs`, `billing` (pre-existing pattern)
**Evidence:** `SupportTicket.userId`/`assigneeId`, `LoginLog.userId`, `Subscription.userId`, `PaymentMethod.userId` are all plain UUID columns with no foreign key to `User`.
**Impact:** Referential integrity is enforced only in application code, if at all; an orphaned row (deleted user) is silently possible.
**Fix:** Not a Phase-7 regression specifically — worth a dedicated pass across the schema rather than a one-off fix.
**Resolution (2026-09-13):** Did the dedicated pass (migration `add_fk_constraints_to_user`) — also caught `Invoice.userId`/`subscriptionId`, which had the same gap but weren't in this entry's original evidence list. `onDelete: Cascade` on owned records (login logs, tickets, subscriptions, payment methods, invoices), `SetNull` on `SupportTicket.assignee` and `Invoice.subscription` so those survive the referenced row going away. No orphaned rows existed, so it applied clean with no manual data fix needed.

### GAP-031 — Stripe webhook path match uses substring instead of exact/prefix ✅ RESOLVED

**Module:** `auth` (throttler guard)
**Evidence:** `gql-throttler.guard.ts`'s Stripe-webhook bypass checks `requestPath.includes('/stripe/webhook')`.
**Impact:** Low — only affects the throttling exemption, not authentication. A crafted path containing that substring would dodge rate-limiting only.
**Fix:** Use an exact or prefix match instead of `includes`.
**Resolution (2026-09-13):** Changed to `startsWith`.

### GAP-032 — `stripe-webhook.controller.ts` uses several `any` casts ✅ RESOLVED

**Module:** `billing`
**Evidence:** `invoice as any`, `stripeSubscription as any` used to reach Stripe SDK fields not on the typed interfaces for the pinned API version.
**Impact:** Bypasses type safety on `current_period_start`/`current_period_end`-style fields; works today but is fragile to a Stripe SDK/API version bump.
**Fix:** Narrow with a local interface for the specific fields accessed, instead of a blanket `any`.
**Resolution (2026-09-13):** Added `StripeInvoiceWithSubscription`/`StripeSubscriptionPeriod` local interfaces for just the fields read; removed the file's now-unneeded blanket eslint-disable for unsafe-assignment/unsafe-member-access.

### GAP-033 — `login-logs` list queries accept an unbounded `limit` ✅ RESOLVED

**Module:** `login-logs`
**Evidence:** `@Args('limit', { type: () => Number, nullable: true })` has no upper-bound validation; passed straight through to Prisma's `take`.
**Impact:** A caller can request an arbitrarily large page.
**Fix:** Clamp server-side (e.g. `Math.min(limit ?? 50, 200)`).
**Resolution (2026-09-13):** Added a `MAX_LIMIT = 200` clamp in `findForUser`/`findAll`.

### GAP-034 — `auth` logout mutation is the only public auth mutation without `@Throttle` ✅ RESOLVED

**Module:** `auth`
**Evidence:** `signIn`, `refreshSession`, `registerAffiliate` all carry `@Throttle`; `logout` doesn't.
**Impact:** Negligible on its own (logout has no real abuse value), just an unexplained inconsistency worth a one-line fix for consistency.
**Fix:** Add the same throttle decorator for consistency.
**Resolution (2026-09-13):** Added `@Throttle(AUTH_THROTTLE)`.

---

## Summary

| Severity    | Count  | Resolved             |
| ----------- | ------ | -------------------- |
| 🔴 Critical | 2      | 2                    |
| 🟠 High     | 12     | 12                   |
| 🟡 Medium   | 14     | 11 (all but GAP-011) |
| ⚪ Low      | 5      | 5                    |
| **Total**   | **33** | **30**               |

**Resolved 2026-09-06:** GAP-001 (Kilo, verified), 003, 004, 005, 006, 007, 008, 009, 010, 012, 014, 019, 020, 021, 027 (16 marked ✅ above — GAP-027 wasn't in the original 33-count, it was found and fixed as a bonus alongside GAP-009).
**Resolved 2026-09-13:** GAP-002 (via labeling, not wiring — see its entry), GAP-013, GAP-016, GAP-017, GAP-018, GAP-022, GAP-023, GAP-024, GAP-025, GAP-026, GAP-028, GAP-029, GAP-030, GAP-031, GAP-032, GAP-033, GAP-034.

**Deferred — large feature build, not a "fix"**: GAP-011 (Stripe checkout/subscription-management mutations) — the only gap still open, and not Critical or High.

**Also resolved since the previous review pass:** the 8-way duplicated reports-resolver/service pattern has been refactored into a shared `paginatedReport` helper in `admin-reports.service.ts`.
