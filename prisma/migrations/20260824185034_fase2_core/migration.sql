-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BranchSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openMin" INTEGER NOT NULL DEFAULT 540,
    "closeMin" INTEGER NOT NULL DEFAULT 1140,
    CONSTRAINT "BranchSchedule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ServiceCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceBranch" (
    "serviceId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    CONSTRAINT "ServiceBranch_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Barber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "specialties" TEXT,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Barber_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Barber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Barber_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BarberService" (
    "barberId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "commissionPctOverride" REAL,
    CONSTRAINT "BarberService_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BarberService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BarberSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barberId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    CONSTRAINT "BarberSchedule_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "barberId" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeOff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeOff_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeOff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "birthDate" DATETIME,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "source" TEXT NOT NULL DEFAULT 'ONLINE',
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "notes" TEXT,
    "cancelReason" TEXT,
    "checkedInAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "noShowAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppointmentService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    CONSTRAINT "AppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("createdAt", "currency", "id", "name", "plan", "slug", "status", "timezone", "trialEndsAt", "updatedAt") SELECT "createdAt", "currency", "id", "name", "plan", "slug", "status", "timezone", "trialEndsAt", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchSchedule_branchId_weekday_key" ON "BranchSchedule"("branchId", "weekday");

-- CreateIndex
CREATE INDEX "ServiceCategory_tenantId_idx" ON "ServiceCategory"("tenantId");

-- CreateIndex
CREATE INDEX "Service_tenantId_isActive_idx" ON "Service"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceBranch_branchId_idx" ON "ServiceBranch"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBranch_serviceId_branchId_key" ON "ServiceBranch"("serviceId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Barber_userId_key" ON "Barber"("userId");

-- CreateIndex
CREATE INDEX "Barber_tenantId_isActive_idx" ON "Barber"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "BarberService_serviceId_idx" ON "BarberService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "BarberService_barberId_serviceId_key" ON "BarberService"("barberId", "serviceId");

-- CreateIndex
CREATE INDEX "BarberSchedule_barberId_weekday_idx" ON "BarberSchedule"("barberId", "weekday");

-- CreateIndex
CREATE INDEX "TimeOff_tenantId_startsAt_endsAt_idx" ON "TimeOff"("tenantId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "TimeOff_barberId_startsAt_endsAt_idx" ON "TimeOff"("barberId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_phone_key" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_startsAt_idx" ON "Appointment"("tenantId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_barberId_startsAt_status_idx" ON "Appointment"("barberId", "startsAt", "status");

-- CreateIndex
CREATE INDEX "Appointment_branchId_startsAt_idx" ON "Appointment"("branchId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_customerId_startsAt_idx" ON "Appointment"("customerId", "startsAt");

-- CreateIndex
CREATE INDEX "AppointmentService_appointmentId_idx" ON "AppointmentService"("appointmentId");
