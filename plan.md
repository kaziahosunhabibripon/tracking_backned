# Tracking Backend — Implementation Plan (NestJS + GraphQL + Prisma)

> **Source of truth** for what the `tracking-backend` service must deliver.
> Aligned with: `tracking-super-admin-dashboard`, `tracking-advertiser-dashboard`, `traking-web`.
> Auth + cookies + Prisma base are **already implemented** (Phases 1 mostly done).

---

## 0. Current State (already shipped)

| Area                                                              | Status     | Notes                                                              |
| ----------------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| NestJS 11 + Apollo GraphQL + Pino + helmet                        | ✅         | `src/app.module.ts`, `src/main.ts`                                 |
| Prisma 6 + PostgreSQL (`tracking_dev` DB created)                 | ✅         | `prisma/schema.prisma` — User, RefreshToken, Affiliate             |
| Env validation (zod-style with `validateEnv`)                     | ✅         | `src/config/env.validation.ts`                                     |
| JWT access + httpOnly refresh cookies + rotation                  | ✅         | `auth.service.ts`, `refresh-token.service.ts`, `cookie.service.ts` |
| Global GraphQL guards (throttle → jwt → roles)                    | ✅         | `gql-throttler`, `gql-jwt-auth`, `roles.guard`                     |
| Throttler, depth/field-count limits                               | ✅         | `common/graphql/query-limits.rule.ts`                              |
| Sentry error reporting (noop fallback)                            | ✅         | `common/monitoring/`                                               |
| Affiliate self-registration (`registerAffiliate` mutation)        | ✅         | Matches `traking-web/signup` form fields                           |
| Sign-in / sign-out / refresh / `me` query                         | ✅         | Matches both dashboards                                            |
| `AffiliateStatus.PENDING` flow (no dashboard gating yet)          | 🟡 Partial | Resolver-side gating TODO                                          |
| `UserRole.SUPER_ADMIN / ADMIN / MANAGER / STAFF / AFFILIATE` enum | ✅         |                                                                    |

**Module map (current):**

```
src/common/         # constants, decorators, errors, filters, graphql, guards, monitoring, pagination, utils
src/config/         # app, auth, database, graphql, env-paths, env.validation
src/database/       # prisma.service, database.module, seeds/
src/modules/
  auth/             # ✅ done
  users/            # ✅ done
  affiliates/       # ✅ skeleton
```

---

## 1. Architecture

### 1.1 Tech stack (locked)

| Layer        | Choice                                                  | Why                                                                     |
| ------------ | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| Framework    | **NestJS 11**                                           | Already in place; modular, DI, decorators.                              |
| API surface  | **GraphQL (Apollo)** for dashboard/admin                | Already wired with auto-schema, depth/field limits.                     |
| Tracking     | **REST (controllers only, NOT GraphQL)**                | Low-latency redirect + S2S postback from affiliate networks.            |
| DB           | **PostgreSQL + Prisma 6**                               | Already in place.                                                       |
| Auth         | **JWT access + httpOnly refresh cookies + rotation**    | Already in place.                                                       |
| Caching      | None (defer)                                            | Add Redis only when reports slow down.                                  |
| Monitoring   | **Sentry** (noop in dev)                                | Already wired.                                                          |
| Rate limit   | `@nestjs/throttler`                                     | Already wired (60s × 120 default).                                      |
| File storage | Local (`./uploads`) → S3-compatible later               | Phase 2 add-on.                                                         |
| Payments     | **Stripe** (subscriptions + invoices + payment methods) | v1 — `traking-web/pricing` collects plans, super-admin manages billing. |

### 1.2 Roles (already defined)

| Role          | Source dashboard     | Notes                                                       |
| ------------- | -------------------- | ----------------------------------------------------------- |
| `SUPER_ADMIN` | super-admin          | Full network access, system settings.                       |
| `ADMIN`       | super-admin          | Network ops, but no system settings.                        |
| `MANAGER`     | super-admin          | Manages assigned advertisers/affiliates.                    |
| `STAFF`       | super-admin          | Read-only ops / limited actions.                            |
| `AFFILIATE`   | traking-web (signup) | Promotes offers; sees own stats.                            |
| `ADVERTISER`  | **TODO — new role**  | Manages own campaigns/ads. Self-registers or admin-created. |

### 1.3 Why two API styles

| Concern                                                  | GraphQL                                 | REST |
| -------------------------------------------------------- | --------------------------------------- | ---- |
| Dashboard CRUD (campaigns, affiliates, offers, settings) | ✅                                      | ❌   |
| Reports / aggregations                                   | ✅ (single round-trip, field selection) | ❌   |
| Tracking redirect (`GET /r/:slug`)                       | ❌ (overhead)                           | ✅   |
| S2S postback from affiliate networks                     | ❌ (they POST form-encoded)             | ✅   |
| Public file/icon delivery                                | n/a                                     | ✅   |
| Public marketing CMS (FAQs, signup questions)            | ✅ (cached)                             | n/a  |

---

## 2. Scope per frontend

### 2.1 `traking-web` (marketing site)

- Public pages — no API.
- `/login` and `/signup` → calls **`signIn`** / **`registerAffiliate`** mutations.
- CORS origin: `http://localhost:3000` (already whitelisted).

### 2.2 `tracking-super-admin-dashboard` (network operator)

**Nav (full):** Overview · Affiliates (+Add/Pending/Referral/Groups/Payments) · Manager (+Add/All) · Advertiser (+Add/All) · Offer (+Add/All/CR-Optimizer/Approval) · Reports (Offer/Affiliate/Advertiser/Conversion/ClickLog/Postback×2/Fraud) · Notifications (Send/All) · Billing (+History) · Settings (System/Network/Preference/Email/LoginLogs/Usage/Review/SupportTickets).

**Backend modules needed:**

- `advertisers` (CRUD + add-form fields, manager-assign, status, commission, payout method)
- `managers` (CRUD + role + permissions)
- `offers` (CRUD + categories + traffic sources + access public/private)
- `affiliate-groups` (CRUD + members + budget + tags)
- `affiliate-payments` (records + terms + balances)
- `referral-programs` (affiliate-referral tracking)
- `notifications` (broadcast + per-user + read-state)
- `billing` (plans, addons, subscription, invoices, history)
- `settings` (system, network, preference, email, faqs, signup-questions, login-logs, usage, review, support-tickets, roles+permissions)
- `reports/*` (offer, affiliate, advertiser, conversion, click-log, postback, fraud)
- `cr-optimizer` (experiments / mini-programs)

### 2.3 `tracking-advertiser-dashboard` (advertiser self-service)

**Nav (scoped):** Overview · Campaigns (Create/All + details) · Reports · Notification · Settings.

**Backend modules needed:**

- `campaigns` (5-step create form, list, details, status toggle, soft-delete, icon upload, payouts nested, caps nested, remarks nested, partner dropdown)
- `reports` (advertiser-scoped — overview stats, performance series, top campaigns, conversions/clicks)
- `notifications` (per-advertiser)
- `settings` (advertiser profile, password change)

### 2.4 Tracking flow (REST, no UI)

- `GET /r/:slug` — redirect to offer URL, log Click.
- `POST /postback/:campaignId` — S2S conversion ingest (HMAC-signed).

---

## 3. Database schema (Prisma)

Current models: `User`, `RefreshToken`, `Affiliate`. New models to add:

```prisma
// ---- Roles (extend) ----
enum UserRole { SUPER_ADMIN ADMIN MANAGER STAFF AFFILIATE ADVERTISER } // add ADVERTISER

// ---- New: Advertiser profile ----
model Advertiser {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @unique @db.Uuid
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName   String
  phone         String
  country       String
  managerId     String?  @db.Uuid
  manager       User?    @relation("ManagerToAdvertisers", fields: [managerId], references: [id])
  contactMethod ContactMethod?
  contactId     String?
  description   String?
  commissionRate Decimal? @db.Decimal(5,2)
  payoutMethod  String?
  referralCode  String?  @unique
  status        AdvertiserStatus @default(PENDING)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  campaigns     Campaign[]
}
enum AdvertiserStatus { PENDING ACTIVE INACTIVE SUSPENDED }

// ---- New: Manager role has same shape as User, gated by role; no extra model ----

// ---- New: Offer (created by Admin) ----
enum OfferType { CPA CPL CPS CPI }
enum OfferStatus { PENDING APPROVED REJECTED ACTIVE PAUSED EXPIRED }
enum OfferAccess { PUBLIC PRIVATE }
model Offer {
  id              String      @id @default(uuid()) @db.Uuid
  advertiserId    String      @db.Uuid
  advertiser      Advertiser  @relation(fields: [advertiserId], references: [id])
  name            String
  slug            String      @unique
  type            OfferType
  category        String
  currency        Currency    @default(USD)
  previewLink     String
  trackingLink    String
  description     String?
  icon            String?
  trafficSources  String[]    // pg array
  status          OfferStatus @default(PENDING)
  access          OfferAccess @default(PUBLIC)
  networkOfferId  String?     @unique
  startDate       DateTime?
  endDate         DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  payouts         OfferPayout[]
  caps            OfferCap[]
  remarks         OfferRemark[]
  clicks          Click[]
  conversions     Conversion[]
  @@index([advertiserId, status])
}

// ---- New: Campaign (advertiser-self-service; thin wrapper over Offer, scoped to advertiser) ----
enum CampaignStatus { DRAFT PENDING_APPROVAL ACTIVE PAUSED EXPIRED REJECTED }
enum CostModel { CPA CPL CPS REVSHARE }
enum PayoutType { CPA CPL CPS REVSHARE FLAT }
enum CapType { DAILY WEEKLY MONTHLY TOTAL }
enum Currency { USD EUR GBP }
model Campaign {
  id             String         @id @default(uuid()) @db.Uuid
  slug           String         @unique
  advertiserId   String         @db.Uuid
  advertiser     Advertiser     @relation(fields: [advertiserId], references: [id])
  offerId        String?        @db.Uuid     // optional link to admin Offer
  offer          Offer?         @relation(fields: [offerId], references: [id])
  name           String
  title          String
  description    String?
  kpi            String?
  category       String
  previewLink    String
  trackingLink   String
  partner        String?        // free-text partner name; dropdown in UI from /campaigns/options
  costModel      CostModel      @default(CPA)
  defaultCost    Decimal        @db.Decimal(12,4)
  currency       Currency       @default(USD)
  startDate      DateTime
  endDate        DateTime
  status         CampaignStatus @default(DRAFT)
  icon           String?
  geo            String[]       // ISO codes
  trafficAllowed String[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  payouts     CampaignPayout[]
  caps        CampaignCap[]
  remarks     CampaignRemark[]
  clicks      Click[]
  conversions Conversion[]
  @@index([advertiserId, status])
  @@index([createdAt])
}
model CampaignPayout {
  id          String     @id @default(uuid()) @db.Uuid
  campaignId  String     @db.Uuid
  campaign    Campaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  country     String?
  device      String?
  platform    String?
  payoutType  PayoutType
  payoutValue Decimal    @db.Decimal(12,4)
  currency    Currency   @default(USD)
  createdAt   DateTime   @default(now())
}
model CampaignCap {
  id           String   @id @default(uuid()) @db.Uuid
  campaignId   String   @db.Uuid
  campaign     Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  capType      CapType
  capLimit     Int
  currentCount Int      @default(0)
  resetAt      DateTime?
  createdAt    DateTime @default(now())
}
model CampaignRemark {
  id         String   @id @default(uuid()) @db.Uuid
  campaignId String   @db.Uuid
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  forRole    UserRole
  text       String
  createdAt  DateTime @default(now())
}

// ---- New: Offer nested (admin-managed) ----
model OfferPayout { id String @id @default(uuid()) @db.Uuid; offerId String @db.Uuid; offer Offer @relation(fields: [offerId], references:[id], onDelete:Cascade); country String?; payoutType PayoutType; payoutValue Decimal @db.Decimal(12,4); currency Currency @default(USD) }
model OfferCap    { id String @id @default(uuid()) @db.Uuid; offerId String @db.Uuid; offer Offer @relation(fields: [offerId], references:[id], onDelete:Cascade); capType CapType; capLimit Int; currentCount Int @default(0); resetAt DateTime? }
model OfferRemark { id String @id @default(uuid()) @db.Uuid; offerId String @db.Uuid; offer Offer @relation(fields: [offerId], references:[id], onDelete:Cascade); forRole UserRole; text String; createdAt DateTime @default(now()) }

// ---- New: Affiliate groups ----
enum AffiliateGroupStatus { ACTIVE PENDING SUSPENDED }
model AffiliateGroup {
  id            String              @id @default(uuid()) @db.Uuid
  name          String
  description   String?
  iconKey       String?             // matches "zap"/"mail"/etc in UI
  status        AffiliateGroupStatus @default(ACTIVE)
  totalBudget   Decimal?            @db.Decimal(14,2)
  budgetAlertPercent Int?
  startDate     DateTime?
  endDate       DateTime?
  defaultCommission Decimal?        @db.Decimal(5,2)
  cookieDurationDays Int?
  payoutMethod  String?
  minimumPayout Decimal?            @db.Decimal(12,4)
  tags          String[]
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  members       AffiliateGroupMember[]
}
model AffiliateGroupMember {
  groupId   String @db.Uuid
  affiliateId String @db.Uuid
  affiliate Affiliate @relation(fields: [affiliateId], references: [id], onDelete: Cascade)
  group     AffiliateGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  joinedAt  DateTime @default(now())
  @@id([groupId, affiliateId])
}

// ---- New: Affiliate payments ----
enum PayTerm { NET_15 NET_30 NET_45 NET_60 }
model AffiliatePayment {
  id              String   @id @default(uuid()) @db.Uuid
  affiliateId     String   @db.Uuid
  affiliate       Affiliate @relation(fields: [affiliateId], references: [id], onDelete: Cascade)
  payTerm         PayTerm
  currency        Currency
  currentBalance  Decimal  @db.Decimal(14,4) @default(0)
  paidBalance     Decimal  @db.Decimal(14,4) @default(0)
  pendingBalance  Decimal  @db.Decimal(14,4) @default(0)
  totalPayout     Decimal  @db.Decimal(14,4) @default(0)
  updatedAt       DateTime @updatedAt
}

// ---- New: Referral programs (affiliate-referral) ----
model ReferralProgram {
  id          String   @id @default(uuid()) @db.Uuid
  affiliateId String   @db.Uuid
  affiliate   Affiliate @relation(fields: [affiliateId], references: [id], onDelete: Cascade)
  code        String   @unique
  referredCount Int    @default(0)
  createdAt   DateTime @default(now())
}

// ---- New: Tracking core ----
model Click {
  id          String   @id @default(uuid()) @db.Uuid
  campaignId  String?  @db.Uuid
  campaign    Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  offerId     String?  @db.Uuid
  offer       Offer?   @relation(fields: [offerId], references: [id], onDelete: SetNull)
  clickId     String   @unique
  ip          String
  userAgent   String
  country     String?
  device      String?
  browser     String?
  referrer    String?
  source      String?
  isUnique    Boolean  @default(false)
  createdAt   DateTime @default(now())
  conversions Conversion[]
  @@index([campaignId, createdAt])
  @@index([offerId, createdAt])
}
model Conversion {
  id            String   @id @default(uuid()) @db.Uuid
  campaignId    String?  @db.Uuid
  campaign      Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  offerId       String?  @db.Uuid
  offer         Offer?   @relation(fields: [offerId], references: [id], onDelete: SetNull)
  clickId       String
  click         Click    @relation(fields: [clickId], references: [clickId])
  affiliateId   String?  @db.Uuid
  affiliate     Affiliate? @relation(fields: [affiliateId], references: [id])
  revenue       Decimal  @db.Decimal(14,4)
  payout        Decimal  @db.Decimal(14,4)
  status        ConversionStatus @default(PENDING)
  transactionId String   @unique
  goalId        String?
  createdAt     DateTime @default(now())
  @@index([campaignId, status, createdAt])
  @@index([offerId, status, createdAt])
}
enum ConversionStatus { PENDING APPROVED REJECTED }

// ---- New: Postback delivery logs (both directions) ----
model AffiliatePostbackLog {
  id            String   @id @default(uuid()) @db.Uuid
  affiliateId   String?  @db.Uuid
  transactionId String
  endpointUrl   String
  httpStatus    Int
  attempts      Int      @default(1)
  successful    Boolean
  payload       Json?
  createdAt     DateTime @default(now())
  @@index([transactionId])
}
model AdvertiserPostbackLog {
  id            String   @id @default(uuid()) @db.Uuid
  advertiserId  String?  @db.Uuid
  transactionId String
  endpointUrl   String   // our receiving URL
  httpStatus    Int
  attempts      Int      @default(1)
  successful    Boolean
  payload       Json?
  createdAt     DateTime @default(now())
  @@index([transactionId])
}

// ---- New: Fraud cases ----
enum FraudRisk { LOW MEDIUM HIGH }
enum FraudCaseStatus { OPEN BLOCKED CLEARED }
model FraudCase {
  id              String   @id @default(uuid()) @db.Uuid
  affiliateId     String   @db.Uuid
  offerId         String?  @db.Uuid
  reason          String
  flaggedClicks   Int
  fraudPercent    Decimal  @db.Decimal(5,2)
  risk            FraudRisk
  status          FraudCaseStatus @default(OPEN)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ---- New: Notifications ----
enum NotificationRecipient { AFFILIATE ADVERTISER MANAGER ALL }
model Notification {
  id          String   @id @default(uuid()) @db.Uuid
  recipient   NotificationRecipient
  userId      String?  @db.Uuid    // null = broadcast to role
  offerId     String?  @db.Uuid
  type        String
  title       String
  message     String
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())
  @@index([userId, read, createdAt])
}

// ---- New: Billing ----
enum InvoiceStatus { PAID DUE OVERDUE CANCELLED }
model BillingPlan {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  priceMonthly Decimal @db.Decimal(12,2)
  features    String[]
  addons      Json?
  isActive    Boolean  @default(true)
}
model Subscription {
  id            String   @id @default(uuid()) @db.Uuid
  networkOwnerId String @db.Uuid
  planId        String   @db.Uuid
  plan          BillingPlan @relation(fields:[planId], references:[id])
  startDate     DateTime
  endDate       DateTime?
  isActive      Boolean   @default(true)
}
model Invoice {
  id          String   @id @default(uuid()) @db.Uuid
  subscriptionId String @db.Uuid
  amount      Decimal  @db.Decimal(12,2)
  currency    Currency @default(USD)
  status      InvoiceStatus @default(DUE)
  dueDate     DateTime
  paidAt      DateTime?
  createdAt   DateTime @default(now())
}

// ---- New: Settings (config tables) ----
model NetworkSetting {
  id        String   @id @default(uuid()) @db.Uuid
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}
model EmailSetting {
  id        String   @id @default(uuid()) @db.Uuid
  smtpHost  String
  smtpPort  Int
  username  String
  password  String   // encrypted at rest
  fromName  String
  fromEmail String
  isActive  Boolean  @default(true)
}
model Faq {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  description String
  sortOrder Int
  status    String   @default("active") // active|inactive
  createdAt DateTime @default(now())
}
model SignupQuestion {
  id        String   @id @default(uuid()) @db.Uuid
  question  String
  required  Boolean  @default(false)
  sortOrder Int
  status    String   @default("active")
}
model SupportTicket {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  subject   String
  message   String
  priority  String   // low|medium|high
  status    String   @default("open")
  createdAt DateTime @default(now())
}
model LoginLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields:[userId], references:[id], onDelete: Cascade)
  ip        String
  userAgent String
  successful Boolean
  createdAt DateTime @default(now())
  @@index([userId, createdAt])
}
model RolePermission {
  id        String @id @default(uuid()) @db.Uuid
  role      UserRole
  key       String   // e.g. "offer.create"
  allowed   Boolean  @default(false)
  @@unique([role, key])
}

// ---- New: CR Optimizer (experiments) ----
model CrExperiment {
  id        String   @id @default(uuid()) @db.Uuid
  offerId   String   @db.Uuid
  name      String
  variantA  Json
  variantB  Json
  status    String   @default("draft") // draft|running|completed
  resultA   Json?
  resultB   Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 4. NestJS module plan

```
src/modules/
  auth/                  ✅ done
  users/                 ✅ done
  affiliates/            🟡 skeleton → finish + payments + groups + referral
    resolvers: me, search, byStatus, byManager, payments, groups
  advertisers/           ⬜ NEW — full CRUD (admin + self-serve)
  managers/              ⬜ NEW — CRUD + permissions
  offers/                ⬜ NEW — full CRUD + CR optimizer
    offers.resolver.ts
    offers-payout.resolver.ts
    offers-cap.resolver.ts
    offers-remark.resolver.ts
  campaigns/             ⬜ NEW — advertiser CRUD (5-step form)
    campaigns.resolver.ts
    campaign-payouts.resolver.ts
    campaign-caps.resolver.ts
    campaign-remarks.resolver.ts
    campaigns-options.resolver.ts   # partner / currency / category / traffic dropdowns
  tracking/              ⬜ NEW — REST only
    tracking.controller.ts          # GET /r/:slug
    postback.controller.ts          # POST /postback/:campaignId
    tracking.service.ts             # Click ingest, conversion ingest, dedupe, cap check
  reports/               ⬜ NEW — GraphQL aggregations
    overview.resolver.ts            # stat cards (clicks, CR, pending payout, total spent)
    performance.resolver.ts         # date-range series
    top-campaigns.resolver.ts
    offer-report.resolver.ts        # super-admin
    affiliate-report.resolver.ts    # super-admin
    advertiser-report.resolver.ts   # super-admin
    conversion-report.resolver.ts
    click-log-report.resolver.ts
    fraud-report.resolver.ts
  notifications/         ⬜ NEW
    notifications.resolver.ts
    broadcast.service.ts
  billing/               ⬜ NEW
    plans.resolver.ts
    subscription.resolver.ts
    invoices.resolver.ts
  settings/              ⬜ NEW
    network-settings.resolver.ts
    system-settings.resolver.ts
    email-settings.resolver.ts
    preference-settings.resolver.ts
    faqs.resolver.ts
    signup-questions.resolver.ts
    login-logs.resolver.ts
    support-tickets.resolver.ts
    roles-permissions.resolver.ts
  cr-optimizer/          ⬜ NEW (lives under offers)
  files/                 ⬜ NEW — local upload + static serve
    files.controller.ts              # POST /files/icon
    files.service.ts
```

**Shared infra to add:**

- `src/common/pagination/cursor.ts` — already present, reuse.
- `src/common/utils/ids.util.ts` — cuid/uuid helper.
- `src/common/decorators/scopes.decorator.ts` — `@AdvertiserScoped()` so resolvers only return caller's own rows.
- `src/common/guards/advertiser-scope.guard.ts` — pulls `Advertiser.id` from JWT, throws if mismatched.
- `src/common/filters/` — already has global filter; extend with click/postback dedupe errors.

---

## 5. GraphQL schema (top-level, derived from frontends)

```graphql
# ----- Auth (already) -----
mutation SignIn(input: SignInInput!): AuthPayload!
mutation RegisterAffiliate(input: RegisterAffiliateInput!): AuthPayload!
mutation RefreshSession: AuthPayload!
mutation Logout: Boolean!
query Me: User!

# ----- Advertiser dashboard -----
query Campaigns(filter: CampaignFilter!, pagination: PaginationInput!): CampaignConnection!
query Campaign(id: ID!): Campaign!
query CampaignOptions: CampaignOptions!  # partners, currencies, categories, traffic
query OverviewStats(range: DateRange!): OverviewStats!
query PerformanceSeries(range: DateRange!): [PerformancePoint!]!
query TopCampaigns(range: DateRange!, limit: Int!): [CampaignPerformance!]!
mutation CreateCampaign(input: CreateCampaignInput!): Campaign!
mutation UpdateCampaign(id: ID!, input: UpdateCampaignInput!): Campaign!
mutation DeleteCampaign(id: ID!): Boolean!
mutation ToggleCampaignStatus(id: ID!): Campaign!
mutation UploadCampaignIcon(campaignId: ID!, file: Upload!): Campaign!

# ----- Super-admin -----
query Affiliates(filter: AffiliateFilter!, pagination: PaginationInput!): AffiliateConnection!
query Affiliate(id: ID!): AffiliateDetail!
query Advertisers(filter: AdvertiserFilter!, pagination: PaginationInput!): AdvertiserConnection!
query Managers(filter: ManagerFilter!, pagination: PaginationInput!): ManagerConnection!
query Offers(filter: OfferFilter!, pagination: PaginationInput!): OfferConnection!
mutation CreateAffiliate(input: CreateAffiliateInput!): Affiliate!
mutation UpdateAffiliate(id: ID!, input: UpdateAffiliateInput!): Affiliate!
mutation ApproveAffiliate(id: ID!): Affiliate!
# ... parallel mutations for Advertiser / Manager / Offer
mutation SendNotification(input: SendNotificationInput!): Notification!
# Reports
query OfferReport(filter: ReportFilter!): [OfferReportRow!]!
query AffiliateReport(filter: ReportFilter!): [AffiliateReportRow!]!
query AdvertiserReport(filter: ReportFilter!): [AdvertiserReportRow!]!
query ConversionReport(filter: ReportFilter!): [ConversionReportRow!]!
query ClickLogReport(filter: ReportFilter!): [ClickLogRow!]!
query AffiliatePostbackLog(filter: ReportFilter!): [PostbackLogRow!]!
query AdvertiserPostbackLog(filter: ReportFilter!): [PostbackLogRow!]!
query AffiliateFraudReport(filter: ReportFilter!): [FraudCaseRow!]!
# Settings
query SystemSettings: SystemSettings!
mutation UpdateSystemSettings(input: SystemSettingsInput!): SystemSettings!
query Faqs: [Faq!]!
mutation CreateFaq(input: FaqInput!): Faq!
# ... same for EmailSettings, NetworkSettings, PreferenceSettings, SignupQuestions, LoginLogs, SupportTickets, RolePermissions
# Billing
query BillingPlans: [BillingPlan!]!
query CurrentSubscription: Subscription!
query BillingHistory(filter: DateRange!): [Invoice!]!
# CR Optimizer
query CrExperiments(offerId: ID!): [CrExperiment!]!
mutation CreateCrExperiment(input: CrExperimentInput!): CrExperiment!
```

---

## 6. REST endpoints (tracking only)

| Method | Path                    | Purpose                              | Auth                  |
| ------ | ----------------------- | ------------------------------------ | --------------------- |
| GET    | `/r/:slug`              | 302 redirect to offer URL, log Click | public, throttled     |
| GET    | `/health`               | liveness/readiness                   | public                |
| GET    | `/files/:name`          | serve uploaded icon/image            | public                |
| POST   | `/postback/:campaignId` | S2S conversion ingest                | HMAC signature header |

`POST /postback/:campaignId` body (form-encoded, matches Everflow/Cake/HasOffers):

```
click_id=<uuid>
payout=<decimal>
revenue=<decimal>
txn_id=<unique-id>
s2s=1
goal=<goal-id?>  // optional
```

Headers: `X-Signature: <hmac-sha256(body, POSTBACK_SECRET)>`

**Cap enforcement:** when a Click is recorded, check the matching `CampaignCap` rows — if any cap is reached, return the redirect anyway but stamp a `capBlocked` flag on the Click for reporting.

---

## 7. Phases

> Already shipped: **Phase 1 (Auth)** mostly + Prisma base.

### Phase 2 — Advertiser & Campaign (current priority)

- [ ] Prisma migration: add `ADVERTISER` to enum, create `Advertiser`, `Campaign`, `CampaignPayout`, `CampaignCap`, `CampaignRemark`, `Currency`/`PayoutType`/`CapType`/`CampaignStatus` enums.
- [ ] `src/modules/advertisers/` — GraphQL CRUD (admin create, self-profile, manager-assign).
- [ ] `src/modules/campaigns/` — GraphQL CRUD + nested payouts/caps/remarks.
- [ ] `src/modules/campaigns/campaigns-options.resolver.ts` — dropdown data.
- [ ] `src/modules/files/` — local upload + static serve (campaign icon).
- [ ] CORS: add `http://localhost:3001` for advertiser-dashboard.
- [ ] Seeder: 1 super-admin, 1 advertiser user, 1 manager, 1 affiliate.

### Phase 3 — Tracking engine (REST) ⭐ critical

- [ ] `src/modules/tracking/tracking.controller.ts` — `GET /r/:slug` redirect + Click insert + cap check.
- [ ] `src/modules/tracking/postback.controller.ts` — `POST /postback/:campaignId` HMAC verify + Conversion insert + dedupe by `txn_id`.
- [ ] Geo lookup (ip → country) using `geoip-lite` (free, offline).
- [ ] Device/browser parsing (`ua-parser-js`).
- [ ] `src/database/click-conversion.service.ts` — shared insert + cap/duplicate guards.
- [ ] Env: `POSTBACK_SECRET`, `TRACKING_BASE_URL`.

### Phase 4 — Reports (GraphQL aggregations)

- [ ] `overview.resolver.ts` — `OverviewStats` (4 stat cards).
- [ ] `performance.resolver.ts` — 30-day series (revenue/clicks/conversions).
- [ ] `top-campaigns.resolver.ts` — ranked by revenue/EPC.
- [ ] Super-admin reports: offer/affiliate/advertiser/conversion/click-log/postback/fraud.
- [ ] All reports accept `DateRange` (today / yesterday / 7d / month / last-month / custom).
- [ ] Cursor pagination (use existing `src/common/pagination/cursor.ts`).

### Phase 5 — Affiliate expansion

- [ ] `affiliate-groups` (CRUD + members + budget).
- [ ] `affiliate-payments` (pay-term, balances, totals).
- [ ] `referral-programs` (code + referred count).
- [ ] `affiliate-pending` approval flow.

### Phase 6 — Offers (super-admin)

- [ ] `offers` CRUD with nested payouts/caps/remarks.
- [ ] `offers/approval` (approve / reject).
- [ ] `cr-optimizer` (experiments + results).
- [ ] Link `Offer` to `Campaign` optionally (`campaign.offerId`).

### Phase 7 — Notifications, Settings, Billing (Stripe)

- [ ] `notifications` (broadcast + per-user + mark-read + bell badge).
- [ ] `settings/network`, `settings/system`, `settings/email`, `settings/preference`.
- [ ] `faqs` + `signup-questions` (consumed by traking-web signup form).
- [ ] `login-logs`, `support-tickets`, `roles-permissions`.
- [ ] `billing/plans` (public — `traking-web/pricing`).
- [ ] `billing/subscription` (current + change plan + cancel).
- [ ] `billing/payment-methods` (list/add/delete/set-default).
- [ ] `billing/invoices` (history).
- [ ] `billing/webhook.controller.ts` — `POST /stripe/webhook` (REST, public, throttler-disabled, raw body).
- [ ] Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_PATH`.
- [ ] New dep: `stripe` (npm).

### Phase 8 — Testing, optimization, ops

- [ ] Unit tests per resolver (Jest, already configured).
- [ ] Integration tests via `testcontainers/postgresql` (already in devDeps).
- [ ] E2E flow: signup → login → create campaign → click `/r/:slug` → postback → see conversion in reports.
- [ ] Sentry smoke test.
- [ ] Index audit (`Click(campaignId, createdAt)`, `Conversion(campaignId, status, createdAt)`).
- [ ] Dockerfile + docker-compose for prod.

---

## 8. Time estimate

| Phase                                             | Description                                        | Estimate (single dev, 8h/day) |
| ------------------------------------------------- | -------------------------------------------------- | ----------------------------- |
| Phase 1 (Auth)                                    | ✅ already done                                    | —                             |
| **Phase 2 (Advertiser + Campaign)**               | NEW models + GraphQL + file upload + CORS + seeder | **5–6 days**                  |
| **Phase 3 (Tracking engine)**                     | REST redirect + postback + dedupe + cap + HMAC     | **4–5 days** ⭐               |
| **Phase 4 (Reports)**                             | 9 report resolvers + DateRange + cursor            | **4–5 days**                  |
| **Phase 5 (Affiliate expansion)**                 | groups + payments + referral + pending             | **3–4 days**                  |
| **Phase 6 (Offers)**                              | CRUD + approval + CR-optimizer                     | **3–4 days**                  |
| **Phase 7 (Notif + Settings + Billing + Stripe)** | mixed                                              | **5–6 days**                  |
| **Phase 8 (Testing + ops)**                       | Jest + testcontainers + Docker                     | **3–4 days**                  |
| **Total remaining**                               |                                                    | **28–34 days**                |

Conservative: 30 days at 8h/day.

---

## 9. Execution order (suggested)

- **Week 1:** Phase 2 schema + Advertiser module + Campaign CRUD + dropdowns + seeder.
- **Week 2:** Phase 2 file upload + Phase 3 redirect + Click ingest + cap check.
- **Week 3:** Phase 3 postback + dedupe + Phase 4 advertiser-side reports (overview/performance/top).
- **Week 4:** Phase 4 super-admin reports + Phase 5 affiliate-groups/payments.
- **Week 5:** Phase 6 offers + Phase 7 notifications + settings.
- **Week 6:** Phase 7 settings + billing + Phase 8 testing + Docker.

---

## 10. Locked decisions (sensible defaults — no further questions)

| #   | Decision                | Choice                                                                                                                                                      |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Currency precision      | `Decimal(12,4)` — sub-cent payout support.                                                                                                                  |
| 2   | Geo lookup              | `geoip-lite` (offline, free) — paid service later if needed.                                                                                                |
| 3   | Postback security       | HMAC only (`POSTBACK_SECRET`) — IP allow-list later.                                                                                                        |
| 4   | File storage            | Local `./uploads` — S3-compatible later.                                                                                                                    |
| 5   | CORS origins            | `localhost:3000` (super-admin + traking-web) + `localhost:3001` (advertiser).                                                                               |
| 6   | Advertiser registration | **Admin-only** create — no public form (fraud prevention, matches Everflow/Cake).                                                                           |
| 7   | Traking-web CMS         | FAQs + signup-questions editable from super-admin Settings, exposed via GraphQL.                                                                            |
| 8   | CR Optimizer            | **Skip in v1** — added in a post-launch phase, not blocking core tracking.                                                                                  |
| 9   | Billing (Stripe)        | **v1 required** — subscriptions + invoices + payment methods; webhook receiver in `src/modules/billing/webhook.controller.ts` (REST, public, no throttler). |
| 10  | Cookie domain           | Per-env via `COOKIE_DOMAIN` (e.g. unset locally, root domain in prod).                                                                                      |

---

## 11. Risks / gotchas

- **GraphQL auto-schema** (`autoSchemaFile`) regenerates from TS decorators — keep resolvers in sync; one missing `@Field()` → schema drift.
- **Cookie domain** — set `COOKIE_DOMAIN` per env so `localhost:3000` and `localhost:3001` can share the refresh cookie.
- **Tracking endpoint throughput** — `GET /r/:slug` will be the highest-QPS endpoint; no GraphQL overhead + write to Click via raw SQL or background queue if load warrants.
- **Decimal + JSON serialization** — Prisma `Decimal` is a class; GraphQL needs a custom scalar (`GraphQLJSON` works for output but not for input; use `String` then convert in service).
- **PostgreSQL array columns** (`geo`, `trafficAllowed`, `tags`) — Prisma supports them but indexes are limited; add a join table if you need per-element query.

---

**Status legend:** ✅ done · 🟡 partial · ⬜ todo
