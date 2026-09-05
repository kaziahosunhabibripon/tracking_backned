-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('CPA', 'CPL', 'CPS', 'CPI');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferAccess" AS ENUM ('PUBLIC', 'PRIVATE');

-- DropForeignKey
ALTER TABLE "FraudCase" DROP CONSTRAINT "FraudCase_offerId_fkey";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "offerId" UUID;

-- CreateTable
CREATE TABLE "Offer" (
    "id" UUID NOT NULL,
    "advertiserId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "OfferType" NOT NULL,
    "category" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "previewLink" TEXT NOT NULL,
    "trackingLink" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "trafficSources" TEXT[],
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "access" "OfferAccess" NOT NULL DEFAULT 'PUBLIC',
    "networkOfferId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferPayout" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "country" TEXT,
    "device" TEXT,
    "platform" TEXT,
    "payoutType" "PayoutType" NOT NULL,
    "payoutValue" DECIMAL(12,4) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferCap" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "capType" "CapType" NOT NULL,
    "capLimit" INTEGER NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferCap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferRemark" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "forRole" "UserRole" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferRemark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_slug_key" ON "Offer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_networkOfferId_key" ON "Offer"("networkOfferId");

-- CreateIndex
CREATE INDEX "Offer_advertiserId_status_idx" ON "Offer"("advertiserId", "status");

-- CreateIndex
CREATE INDEX "Offer_createdAt_idx" ON "Offer"("createdAt");

-- CreateIndex
CREATE INDEX "OfferPayout_offerId_idx" ON "OfferPayout"("offerId");

-- CreateIndex
CREATE INDEX "OfferCap_offerId_idx" ON "OfferCap"("offerId");

-- CreateIndex
CREATE INDEX "OfferRemark_offerId_idx" ON "OfferRemark"("offerId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPayout" ADD CONSTRAINT "OfferPayout_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferCap" ADD CONSTRAINT "OfferCap_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferRemark" ADD CONSTRAINT "OfferRemark_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudCase" ADD CONSTRAINT "FraudCase_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
