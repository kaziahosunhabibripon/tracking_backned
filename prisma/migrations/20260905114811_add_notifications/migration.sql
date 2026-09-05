-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "broadcast" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationRead_userId_idx" ON "NotificationRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_notificationId_userId_key" ON "NotificationRead"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
