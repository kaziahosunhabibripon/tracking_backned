-- CreateEnum
CREATE TYPE "AdvertiserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CostModel" AS ENUM ('CPA', 'CPL', 'CPS', 'REVSHARE');

-- CreateEnum
CREATE TYPE "PayoutType" AS ENUM ('CPA', 'CPL', 'CPS', 'REVSHARE', 'FLAT');

-- CreateEnum
CREATE TYPE "CapType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'TOTAL');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADVERTISER';

-- CreateTable
CREATE TABLE "Advertiser" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "managerId" UUID,
    "contactMethod" "ContactMethod",
    "contactId" TEXT,
    "description" TEXT,
    "commissionRate" DECIMAL(5,2),
    "payoutMethod" TEXT,
    "referralCode" TEXT,
    "status" "AdvertiserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "advertiserId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kpi" TEXT,
    "category" TEXT NOT NULL,
    "previewLink" TEXT NOT NULL,
    "trackingLink" TEXT NOT NULL,
    "partner" TEXT,
    "costModel" "CostModel" NOT NULL DEFAULT 'CPA',
    "defaultCost" DECIMAL(12,4) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "icon" TEXT,
    "geo" TEXT[],
    "trafficAllowed" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPayout" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "country" TEXT,
    "device" TEXT,
    "platform" TEXT,
    "payoutType" "PayoutType" NOT NULL,
    "payoutValue" DECIMAL(12,4) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignCap" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "capType" "CapType" NOT NULL,
    "capLimit" INTEGER NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignCap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRemark" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "forRole" "UserRole" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRemark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Advertiser_userId_key" ON "Advertiser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Advertiser_referralCode_key" ON "Advertiser"("referralCode");

-- CreateIndex
CREATE INDEX "Advertiser_managerId_idx" ON "Advertiser"("managerId");

-- CreateIndex
CREATE INDEX "Advertiser_status_idx" ON "Advertiser"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_advertiserId_status_idx" ON "Campaign"("advertiserId", "status");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "CampaignPayout_campaignId_idx" ON "CampaignPayout"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignCap_campaignId_idx" ON "CampaignCap"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignRemark_campaignId_idx" ON "CampaignRemark"("campaignId");

-- AddForeignKey
ALTER TABLE "Advertiser" ADD CONSTRAINT "Advertiser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertiser" ADD CONSTRAINT "Advertiser_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPayout" ADD CONSTRAINT "CampaignPayout_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCap" ADD CONSTRAINT "CampaignCap_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRemark" ADD CONSTRAINT "CampaignRemark_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
