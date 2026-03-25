-- AlterTable: set WebhookLog.status default to PENDING (enum value added in prior migration)
ALTER TABLE "WebhookLog" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"WebhookStatus";

-- CreateIndex
CREATE INDEX "InventoryTransaction_storeId_materialId_createdAt_idx" ON "InventoryTransaction"("storeId", "materialId", "createdAt");

-- CreateIndex
CREATE INDEX "Material_tenantId_idx" ON "Material"("tenantId");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE INDEX "ProductRecipe_productId_sizeVariant_idx" ON "ProductRecipe"("productId", "sizeVariant");

-- CreateIndex
CREATE INDEX "SaleEvent_storeId_soldAt_idx" ON "SaleEvent"("storeId", "soldAt");

-- CreateIndex
CREATE INDEX "StocktakeSession_storeId_status_idx" ON "StocktakeSession"("storeId", "status");

-- CreateIndex
CREATE INDEX "Store_tenantId_idx" ON "Store"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookLog_status_receivedAt_idx" ON "WebhookLog"("status", "receivedAt");

-- AddForeignKey
ALTER TABLE "StoreUser" ADD CONSTRAINT "StoreUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
