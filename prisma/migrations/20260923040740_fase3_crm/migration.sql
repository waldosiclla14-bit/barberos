-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "birthDate" DATETIME,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "preferredBarberId" TEXT,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Customer_preferredBarberId_fkey" FOREIGN KEY ("preferredBarberId") REFERENCES "Barber" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("birthDate", "createdAt", "email", "id", "isActive", "name", "notes", "phone", "tenantId", "updatedAt") SELECT "birthDate", "createdAt", "email", "id", "isActive", "name", "notes", "phone", "tenantId", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX "Customer_tenantId_isActive_idx" ON "Customer"("tenantId", "isActive");
CREATE UNIQUE INDEX "Customer_tenantId_phone_key" ON "Customer"("tenantId", "phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_createdAt_idx" ON "CustomerNote"("customerId", "createdAt");
