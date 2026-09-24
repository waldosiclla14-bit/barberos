-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountPct" INTEGER NOT NULL,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Promotion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Customer_preferredBarberId_fkey" FOREIGN KEY ("preferredBarberId") REFERENCES "Barber" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("birthDate", "createdAt", "email", "id", "isActive", "lastVisitAt", "name", "notes", "phone", "preferredBarberId", "source", "tenantId", "updatedAt", "visitCount") SELECT "birthDate", "createdAt", "email", "id", "isActive", "lastVisitAt", "name", "notes", "phone", "preferredBarberId", "source", "tenantId", "updatedAt", "visitCount" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX "Customer_tenantId_isActive_idx" ON "Customer"("tenantId", "isActive");
CREATE UNIQUE INDEX "Customer_tenantId_phone_key" ON "Customer"("tenantId", "phone");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" DATETIME,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "timezone" TEXT NOT NULL DEFAULT 'America/Lima',
    "allowGuestBooking" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerSol" INTEGER NOT NULL DEFAULT 10,
    "pointRedeemCents" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("allowGuestBooking", "createdAt", "currency", "id", "name", "plan", "slug", "status", "timezone", "trialEndsAt", "updatedAt") SELECT "allowGuestBooking", "createdAt", "currency", "id", "name", "plan", "slug", "status", "timezone", "trialEndsAt", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Promotion_tenantId_isActive_idx" ON "Promotion"("tenantId", "isActive");
