-- CreateEnum
CREATE TYPE "PlanInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'SEPA_DEBIT', 'US_BANK_ACCOUNT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "interval" "PlanInterval" NOT NULL DEFAULT 'MONTH',
    "stripePriceId" TEXT,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "last4" TEXT,
    "brand" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subscriptionId" UUID,
    "stripeInvoiceId" TEXT,
    "number" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "amountDue" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "invoicePdf" TEXT,
    "hostedInvoiceUrl" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON "PaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_stripeInvoiceId_idx" ON "Invoice"("stripeInvoiceId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
