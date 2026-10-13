-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('UNHANDLED', 'ORGANIZING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentEventType" AS ENUM ('REQUEST_RECEIVED', 'STATUS_CHANGED', 'SCHEDULE_CHANGED', 'DETAILS_CHANGED', 'TRIP_LINKED');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('EMAIL', 'TPORT', 'MANUAL');

-- CreateTable
CREATE TABLE "dispatcher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mailbox" TEXT NOT NULL,

    CONSTRAINT "dispatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "statusChangedAt" TIMESTAMP(3) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tportTripId" TEXT,
    "originCity" TEXT NOT NULL,
    "originCountry" CHAR(2) NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "destinationCountry" CHAR(2) NOT NULL,
    "pickupAt" TIMESTAMP(3),
    "deliveryAt" TIMESTAMP(3),
    "cargoDescription" TEXT,
    "specialRequirements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_event" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "type" "ShipmentEventType" NOT NULL,
    "source" "DataSource" NOT NULL,
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_sync" (
    "source" "DataSource" NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_sync_pkey" PRIMARY KEY ("source")
);

-- CreateIndex
CREATE UNIQUE INDEX "dispatcher_mailbox_key" ON "dispatcher"("mailbox");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_reference_key" ON "shipment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_tportTripId_key" ON "shipment"("tportTripId");

-- CreateIndex
CREATE INDEX "shipment_status_pickupAt_idx" ON "shipment"("status", "pickupAt");

-- CreateIndex
CREATE INDEX "shipment_dispatcherId_status_idx" ON "shipment"("dispatcherId", "status");

-- CreateIndex
CREATE INDEX "shipment_event_shipmentId_occurredAt_idx" ON "shipment_event"("shipmentId", "occurredAt");

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "dispatcher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_event" ADD CONSTRAINT "shipment_event_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
