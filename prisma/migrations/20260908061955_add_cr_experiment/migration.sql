-- CreateTable
CREATE TABLE "CrExperiment" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrExperiment_offerId_idx" ON "CrExperiment"("offerId");
