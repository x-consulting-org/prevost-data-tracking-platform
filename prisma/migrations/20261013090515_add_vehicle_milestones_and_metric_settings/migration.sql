-- AlterEnum
ALTER TYPE "ShipmentEventType" ADD VALUE 'RESPONSE_SENT';
ALTER TYPE "ShipmentEventType" ADD VALUE 'PICKED_UP';
ALTER TYPE "ShipmentEventType" ADD VALUE 'DELIVERED';

-- AlterTable
ALTER TABLE "shipment" ADD COLUMN     "vehicleId" TEXT;

-- CreateTable
CREATE TABLE "vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,

    CONSTRAINT "vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_plate_key" ON "vehicle"("plate");

-- CreateIndex
CREATE INDEX "shipment_vehicleId_pickupAt_idx" ON "shipment"("vehicleId", "pickupAt");

-- CreateIndex
CREATE INDEX "shipment_requestedAt_idx" ON "shipment"("requestedAt");

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "metric_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "reviewWindowDays" INTEGER NOT NULL,
    "unansweredAfterMinutes" INTEGER NOT NULL,
    "onTimeToleranceMinutes" INTEGER NOT NULL,
    "repeatedChangeCount" INTEGER NOT NULL,
    "onParTolerancePercent" INTEGER NOT NULL,
    "minMedianSample" INTEGER NOT NULL,
    "minShareSample" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_settings_pkey" PRIMARY KEY ("id"),
    -- Prisma cannot express this: the table holds exactly one row.
    CONSTRAINT "metric_settings_single_row" CHECK ("id" = 1)
);

-- The starting thresholds, placeholders until the operations workshop sets the real ones.
INSERT INTO "metric_settings" (
    "id", "reviewWindowDays", "unansweredAfterMinutes", "onTimeToleranceMinutes",
    "repeatedChangeCount", "onParTolerancePercent", "minMedianSample", "minShareSample", "updatedAt"
) VALUES (1, 30, 120, 30, 2, 15, 3, 5, CURRENT_TIMESTAMP);
