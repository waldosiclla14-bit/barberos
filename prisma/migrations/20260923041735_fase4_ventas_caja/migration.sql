-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT,
    "appointmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "soldByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_soldByUserId_fkey" FOREIGN KEY ("soldByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SERVICE',
    "serviceId" TEXT,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "barberId" TEXT,
    "commissionPct" INTEGER NOT NULL DEFAULT 0,
    "commissionCents" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "openingCents" INTEGER NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "expectedCents" INTEGER NOT NULL,
    "closingCents" INTEGER,
    "differenceCents" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    CONSTRAINT "CashSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashSessionId" TEXT,
    "saleId" TEXT,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CashMovement_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CashMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "ProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "minStockQty" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "commissionPctDefault" INTEGER NOT NULL DEFAULT 40,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("categoryId", "createdAt", "description", "durationMin", "id", "imageUrl", "isActive", "name", "priceCents", "tenantId", "updatedAt") SELECT "categoryId", "createdAt", "description", "durationMin", "id", "imageUrl", "isActive", "name", "priceCents", "tenantId", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE INDEX "Service_tenantId_isActive_idx" ON "Service"("tenantId", "isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_appointmentId_key" ON "Sale"("appointmentId");

-- CreateIndex
CREATE INDEX "Sale_tenantId_createdAt_idx" ON "Sale"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_branchId_createdAt_idx" ON "Sale"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_barberId_idx" ON "SaleItem"("barberId");

-- CreateIndex
CREATE INDEX "CashSession_tenantId_openedAt_idx" ON "CashSession"("tenantId", "openedAt");

-- CreateIndex
CREATE INDEX "CashSession_branchId_status_idx" ON "CashSession"("branchId", "status");

-- CreateIndex
CREATE INDEX "CashMovement_tenantId_createdAt_idx" ON "CashMovement"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CashMovement_cashSessionId_idx" ON "CashMovement"("cashSessionId");

-- CreateIndex
CREATE INDEX "ProductCategory_tenantId_idx" ON "ProductCategory"("tenantId");

-- CreateIndex
CREATE INDEX "Product_tenantId_branchId_idx" ON "Product"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_createdAt_idx" ON "StockMovement"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");
