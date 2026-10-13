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
