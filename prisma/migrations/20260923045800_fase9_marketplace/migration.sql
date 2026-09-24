-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "theme" TEXT NOT NULL DEFAULT 'classic',
    "integrations" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("allowGuestBooking", "createdAt", "currency", "id", "name", "plan", "pointRedeemCents", "pointsPerSol", "slug", "status", "timezone", "trialEndsAt", "updatedAt") SELECT "allowGuestBooking", "createdAt", "currency", "id", "name", "plan", "pointRedeemCents", "pointsPerSol", "slug", "status", "timezone", "trialEndsAt", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
