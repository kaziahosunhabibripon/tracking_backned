-- CreateTable
CREATE TABLE "Referral" (
    "id" UUID NOT NULL,
    "referrerId" UUID NOT NULL,
    "referredId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_referredId_idx" ON "Referral"("referredId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_code_key" ON "Referral"("code");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
