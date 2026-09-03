-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Click" (
    "id" UUID NOT NULL,
    "campaignId" UUID,
    "clickId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "country" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "referrer" TEXT,
    "source" TEXT,
    "isUnique" BOOLEAN NOT NULL DEFAULT false,
    "capBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" UUID NOT NULL,
    "campaignId" UUID,
    "clickId" TEXT NOT NULL,
    "affiliateId" UUID,
    "revenue" DECIMAL(14,4) NOT NULL,
    "payout" DECIMAL(14,4) NOT NULL,
    "status" "ConversionStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT NOT NULL,
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliatePostbackLog" (
    "id" UUID NOT NULL,
    "affiliateId" UUID,
    "transactionId" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "httpStatus" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "successful" BOOLEAN NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliatePostbackLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvertiserPostbackLog" (
    "id" UUID NOT NULL,
    "advertiserId" UUID,
    "transactionId" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "httpStatus" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "successful" BOOLEAN NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvertiserPostbackLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Click_clickId_key" ON "Click"("clickId");

-- CreateIndex
CREATE INDEX "Click_campaignId_createdAt_idx" ON "Click"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "Click_createdAt_idx" ON "Click"("createdAt");

-- CreateIndex
CREATE INDEX "Click_ip_campaignId_createdAt_idx" ON "Click"("ip", "campaignId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversion_transactionId_key" ON "Conversion"("transactionId");

-- CreateIndex
CREATE INDEX "Conversion_campaignId_status_createdAt_idx" ON "Conversion"("campaignId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Conversion_affiliateId_createdAt_idx" ON "Conversion"("affiliateId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliatePostbackLog_transactionId_idx" ON "AffiliatePostbackLog"("transactionId");

-- CreateIndex
CREATE INDEX "AffiliatePostbackLog_createdAt_idx" ON "AffiliatePostbackLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdvertiserPostbackLog_transactionId_idx" ON "AdvertiserPostbackLog"("transactionId");

-- CreateIndex
CREATE INDEX "AdvertiserPostbackLog_createdAt_idx" ON "AdvertiserPostbackLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_clickId_fkey" FOREIGN KEY ("clickId") REFERENCES "Click"("clickId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
