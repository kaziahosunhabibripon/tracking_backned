-- AlterTable
ALTER TABLE "Affiliate" ADD COLUMN     "referralCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_referralCode_key" ON "Affiliate"("referralCode");
