-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "PaymentTerm" (
    "id" UUID NOT NULL,
    "affiliateId" UUID NOT NULL,
    "minPayout" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliatePayment" (
    "id" UUID NOT NULL,
    "affiliateId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliatePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentTerm_affiliateId_idx" ON "PaymentTerm"("affiliateId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerm_affiliateId_key" ON "PaymentTerm"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliatePayment_affiliateId_idx" ON "AffiliatePayment"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliatePayment_status_idx" ON "AffiliatePayment"("status");

-- AddForeignKey
ALTER TABLE "PaymentTerm" ADD CONSTRAINT "PaymentTerm_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliatePayment" ADD CONSTRAINT "AffiliatePayment_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
