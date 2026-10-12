-- CreateIndex
CREATE INDEX "shipment_status_statusChangedAt_idx" ON "shipment"("status", "statusChangedAt");

-- CreateIndex
CREATE INDEX "shipment_customerId_idx" ON "shipment"("customerId");
