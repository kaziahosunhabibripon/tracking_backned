# Tracking Backend Graphs

This document summarizes the current `tracking-backend` project using Mermaid graphs. It reflects the NestJS, GraphQL, REST, Prisma, PostgreSQL, auth, advertiser, campaign, file, and health-check code currently present in the repository.

## System Architecture

```mermaid
flowchart TB
    Dashboard["Super Admin Dashboard"] -->|GraphQL + cookies| APIEntry["NestJS API"]
    PublicSite["Public Tracking Site"] -->|GraphQL + REST| APIEntry
    AdvertiserPortal["Advertiser Portal"] -->|GraphQL + file upload| APIEntry

    subgraph API["NestJS API internals"]
        Main["main.ts<br/>bootstrap"]
        AppModule["AppModule"]
        GraphQL["Apollo GraphQL<br/>/graphql"]
        REST["REST Controllers<br/>/files, /health"]
        Guards["Global Guards<br/>Throttle -> JWT -> Roles"]
        Validation["ValidationPipe<br/>whitelist + transform"]
        Errors["GlobalExceptionFilter"]
        Logging["Pino Logger"]
        Monitoring["MonitoringModule<br/>Sentry or noop"]
    end

    APIEntry --> GraphQL
    APIEntry --> REST
    Main --> AppModule
    Main --> Validation
    Main --> Logging
    AppModule --> GraphQL
    AppModule --> REST
    GraphQL --> Guards
    REST --> Guards
    Guards --> Errors
    Errors -.-> Monitoring

    GraphQL --> Domain["Domain Modules"]
    REST --> Domain
    Domain --> Prisma["PrismaService"]
    Prisma --> DB[("PostgreSQL")]
    REST --> Uploads[("Local uploads directory")]
```

## Module Dependency Graph

```mermaid
flowchart LR
    AppModule["AppModule"]

    ConfigModule["ConfigModule<br/>app/auth/database/graphql config"]
    LoggerModule["LoggerModule<br/>nestjs-pino"]
    ThrottlerModule["ThrottlerModule"]
    GraphQLModule["GraphQLModule<br/>ApolloDriver"]
    DatabaseModule["DatabaseModule<br/>PrismaService"]
    MonitoringModule["MonitoringModule"]
    HealthModule["HealthModule"]
    UsersModule["UsersModule"]
    AffiliatesModule["AffiliatesModule"]
    AuthModule["AuthModule"]
    AdvertisersModule["AdvertisersModule"]
    CampaignsModule["CampaignsModule"]
    FilesModule["FilesModule"]

    AppModule --> ConfigModule
    AppModule --> LoggerModule
    AppModule --> ThrottlerModule
    AppModule --> GraphQLModule
    AppModule --> DatabaseModule
    AppModule --> MonitoringModule
    AppModule --> HealthModule
    AppModule --> UsersModule
    AppModule --> AffiliatesModule
    AppModule --> AuthModule
    AppModule --> AdvertisersModule
    AppModule --> CampaignsModule
    AppModule --> FilesModule

    AuthModule --> UsersModule
    AuthModule --> AffiliatesModule
    AdvertisersModule --> UsersModule
    CampaignsModule --> AdvertisersModule
```

## Request Pipeline

```mermaid
sequenceDiagram
    participant Client
    participant Nest as NestJS
    participant Throttle as GqlThrottlerGuard
    participant JWT as GqlJwtAuthGuard
    participant Roles as RolesGuard
    participant Resolver as Resolver/Controller
    participant Service as Service
    participant Prisma as PrismaService
    participant DB as PostgreSQL

    Client->>Nest: HTTP request
    Nest->>Throttle: rate-limit check
    Throttle->>JWT: authenticate unless @Public
    JWT->>Roles: attach req.user from JWT
    Roles->>Resolver: allow if role metadata passes
    Resolver->>Service: call domain method
    Service->>Prisma: read/write data
    Prisma->>DB: SQL query/transaction
    DB-->>Prisma: result
    Prisma-->>Service: model data
    Service-->>Resolver: DTO-ready data
    Resolver-->>Client: GraphQL/REST response
```

## Authentication And Session Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthResolver
    participant AuthService
    participant UsersService
    participant RefreshTokens as RefreshTokenService
    participant Cookies as CookieService
    participant DB as PostgreSQL

    Client->>AuthResolver: signIn(input) or registerAffiliate(input)
    AuthResolver->>AuthService: authenticate/register

    alt signIn
        AuthService->>UsersService: validateLocalCredentials(email, password)
        UsersService->>DB: find user + compare bcrypt hash
        AuthService->>UsersService: touchLastLogin(userId)
    else registerAffiliate
        AuthService->>UsersService: assertEmailAvailable(email)
        AuthService->>UsersService: hashPassword(password)
        AuthService->>DB: transaction creates User + Affiliate
    end

    AuthService->>RefreshTokens: issue(userId, session meta)
    RefreshTokens->>DB: store hashed refresh token family
    AuthService-->>AuthResolver: AuthPayload(accessToken, refreshToken, user)
    AuthResolver->>Cookies: set httpOnly auth cookies
    AuthResolver-->>Client: AuthPayload

    Client->>AuthResolver: refreshSession()
    AuthResolver->>AuthService: refreshSession(refresh cookie)
    AuthService->>RefreshTokens: rotate(raw refresh token)
    RefreshTokens->>DB: revoke old token + persist new token
    AuthService-->>AuthResolver: new AuthPayload
    AuthResolver->>Cookies: replace auth cookies
```

## Domain Flow: Advertiser Creates Campaign

```mermaid
flowchart TD
    Client["Advertiser Client"] --> Mutation["createCampaign(input)"]
    Mutation --> Guard["RolesExact(ADVERTISER)<br/>Throttle limit 30/min"]
    Guard --> Resolver["CampaignsResolver.create"]
    Resolver --> OwnProfile["AdvertisersService.findByUserId(currentUser.sub)"]
    OwnProfile --> HasProfile{"Advertiser profile exists?"}
    HasProfile -- "No" --> BadRequest["BadRequestException"]
    HasProfile -- "Yes" --> DateCheck{"endDate after startDate?"}
    DateCheck -- "No" --> InvalidDate["BadRequestException"]
    DateCheck -- "Yes" --> Service["CampaignsService.create"]
    Service --> Slug["Create unique slug from campaign name"]
    Slug --> Tx["Prisma transaction"]
    Tx --> Campaign["Create Campaign"]
    Tx --> Payouts["Create CampaignPayout rows"]
    Tx --> Caps["Create CampaignCap rows"]
    Tx --> Remarks["Create CampaignRemark rows"]
    Tx --> Fetch["Load full campaign by id"]
    Fetch --> DTO["Convert Prisma Decimal fields to strings"]
    DTO --> Response["Return Campaign GraphQL object"]
```

## REST Endpoints

```mermaid
flowchart LR
    UploadClient["Advertiser/Admin Client"] --> Upload["POST /files<br/>multipart field: file"]
    Upload --> UploadGuard["RolesExact<br/>ADVERTISER, SUPER_ADMIN, ADMIN"]
    UploadGuard --> FilesService["FilesService.store"]
    FilesService --> Validate["Validate mime type<br/>Validate max 2 MB"]
    Validate --> Disk["Write UUID filename<br/>UPLOAD_DIR or ./uploads"]
    Disk --> UploadResponse["Return /files/:filename URL"]

    Browser["Browser/Image Client"] --> Serve["GET /files/:name"]
    Serve --> PublicFile["@Public"]
    PublicFile --> NameCheck["Validate filename pattern"]
    NameCheck --> ReadDisk["Read from upload dir"]
    ReadDisk --> Stream["Stream file with immutable cache header"]

    Probe["Load balancer / orchestrator"] --> Live["GET /health or /health/live"]
    Probe --> Ready["GET /health/ready"]
    Live --> LiveOK["Return status ok<br/>no DB call"]
    Ready --> DBCheck["Prisma SELECT 1"]
    DBCheck --> ReadyOK["Return status ok"]
```

## Prisma Entity Relationship Graph

```mermaid
erDiagram
    USER {
        uuid id PK
        string email UK
        string password
        string firstName
        string lastName
        UserRole role
        boolean isActive
        datetime emailVerifiedAt
        datetime lastLoginAt
        datetime createdAt
        datetime updatedAt
    }

    REFRESH_TOKEN {
        uuid id PK
        uuid userId FK
        string tokenHash UK
        string family
        string userAgent
        string ipAddress
        datetime expiresAt
        datetime revokedAt
        datetime createdAt
    }

    AFFILIATE {
        uuid id PK
        uuid userId FK
        BusinessType businessType
        string phone
        string country
        ContactMethod contactMethod
        CurrentPlatform currentPlatform
        ReferralSource referralSource
        AffiliateStatus status
        datetime createdAt
        datetime updatedAt
    }

    ADVERTISER {
        uuid id PK
        uuid userId FK
        string companyName
        string phone
        string country
        uuid managerId FK
        ContactMethod contactMethod
        string contactId
        string description
        decimal commissionRate
        string payoutMethod
        string referralCode UK
        AdvertiserStatus status
        datetime createdAt
        datetime updatedAt
    }

    CAMPAIGN {
        uuid id PK
        string slug UK
        uuid advertiserId FK
        string name
        string title
        string category
        string previewLink
        string trackingLink
        CostModel costModel
        decimal defaultCost
        Currency currency
        datetime startDate
        datetime endDate
        CampaignStatus status
        stringArray geo
        stringArray trafficAllowed
        datetime createdAt
        datetime updatedAt
    }

    CAMPAIGN_PAYOUT {
        uuid id PK
        uuid campaignId FK
        string country
        string device
        string platform
        PayoutType payoutType
        decimal payoutValue
        Currency currency
        datetime createdAt
    }

    CAMPAIGN_CAP {
        uuid id PK
        uuid campaignId FK
        CapType capType
        int capLimit
        int currentCount
        datetime resetAt
        datetime createdAt
    }

    CAMPAIGN_REMARK {
        uuid id PK
        uuid campaignId FK
        UserRole forRole
        string text
        datetime createdAt
    }

    USER ||--o| AFFILIATE : "has affiliate profile"
    USER ||--o| ADVERTISER : "has advertiser profile"
    USER ||--o{ REFRESH_TOKEN : "owns sessions"
    USER ||--o{ ADVERTISER : "manages"
    ADVERTISER ||--o{ CAMPAIGN : "owns"
    CAMPAIGN ||--o{ CAMPAIGN_PAYOUT : "has payouts"
    CAMPAIGN ||--o{ CAMPAIGN_CAP : "has caps"
    CAMPAIGN ||--o{ CAMPAIGN_REMARK : "has remarks"
```

## Resolver Surface

```mermaid
flowchart TB
    GraphQL["GraphQL API"]

    GraphQL --> AuthResolver["AuthResolver"]
    AuthResolver --> Register["registerAffiliate"]
    AuthResolver --> SignIn["signIn"]
    AuthResolver --> Refresh["refreshSession"]
    AuthResolver --> Logout["logout"]
    AuthResolver --> Me["me"]

    GraphQL --> AdvertisersResolver["AdvertisersResolver"]
    AdvertisersResolver --> AdvertisersList["advertisers"]
    AdvertisersResolver --> AdvertisersCount["advertisersCount"]
    AdvertisersResolver --> AdvertiserById["advertiser(id)"]
    AdvertisersResolver --> MyAdvertiser["myAdvertiserProfile"]
    AdvertisersResolver --> CreateAdvertiser["createAdvertiser"]
    AdvertisersResolver --> UpdateAdvertiser["updateAdvertiser"]
    AdvertisersResolver --> DeleteAdvertiser["softDeleteAdvertiser"]

    GraphQL --> CampaignsResolver["CampaignsResolver"]
    CampaignsResolver --> CampaignsList["campaigns"]
    CampaignsResolver --> CampaignsCount["campaignsCount"]
    CampaignsResolver --> CampaignById["campaign(id)"]
    CampaignsResolver --> CreateCampaign["createCampaign"]
    CampaignsResolver --> UpdateCampaign["updateCampaign"]
    CampaignsResolver --> ToggleCampaign["toggleCampaignStatus"]
    CampaignsResolver --> DeleteCampaign["softDeleteCampaign"]

    GraphQL --> CampaignOptionsResolver["CampaignOptionsResolver"]
    CampaignOptionsResolver --> CampaignOptions["campaignOptions"]
```
