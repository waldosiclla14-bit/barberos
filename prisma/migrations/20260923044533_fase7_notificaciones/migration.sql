-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "channel" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NotificationTemplate_tenantId_kind_idx" ON "NotificationTemplate"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "MessageLog_tenantId_createdAt_idx" ON "MessageLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageLog_customerId_createdAt_idx" ON "MessageLog"("customerId", "createdAt");
