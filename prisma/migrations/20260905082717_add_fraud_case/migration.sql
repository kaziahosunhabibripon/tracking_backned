-- CreateEnum
CREATE TYPE "FraudRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FraudCaseStatus" AS ENUM ('OPEN', 'BLOCKED', 'CLEARED');

-- CreateTable
CREATE TABLE "FraudCase" (
    "id" UUID NOT NULL,
    "affiliateId" UUID,
    "offerId" UUID,
    "reason" TEXT NOT NULL,
    "flaggedClicks" INTEGER NOT NULL DEFAULT 0,
    "fraudPercent" DECIMAL(5,2) NOT NULL,
    "risk" "FraudRiskLevel" NOT NULL,
    "status" "FraudCaseStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FraudCase_affiliateId_idx" ON "FraudCase"("affiliateId");

-- CreateIndex
CREATE INDEX "FraudCase_offerId_idx" ON "FraudCase"("offerId");

-- CreateIndex
CREATE INDEX "FraudCase_status_idx" ON "FraudCase"("status");

-- AddForeignKey
ALTER TABLE "FraudCase" ADD CONSTRAINT "FraudCase_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudCase" ADD CONSTRAINT "FraudCase_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
