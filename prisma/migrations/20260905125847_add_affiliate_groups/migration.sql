-- CreateTable
CREATE TABLE "AffiliateGroup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budget" DECIMAL(12,4),
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateGroupMember" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "affiliateId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateGroup_name_idx" ON "AffiliateGroup"("name");

-- CreateIndex
CREATE INDEX "AffiliateGroupMember_affiliateId_idx" ON "AffiliateGroupMember"("affiliateId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateGroupMember_groupId_affiliateId_key" ON "AffiliateGroupMember"("groupId", "affiliateId");

-- CreateIndex
CREATE INDEX "Affiliate_status_idx" ON "Affiliate"("status");

-- AddForeignKey
ALTER TABLE "AffiliateGroupMember" ADD CONSTRAINT "AffiliateGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AffiliateGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateGroupMember" ADD CONSTRAINT "AffiliateGroupMember_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
