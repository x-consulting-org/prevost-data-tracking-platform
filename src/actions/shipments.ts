"use server";

import type { z } from "zod";
import { parseActionInput } from "@/actions/helpers/parse";
import {
  shipmentDetailInputSchema,
  shipmentFilterSchema,
  shipmentPageInputSchema,
} from "@/lib/shipments/schemas";
import { requirePrincipal } from "@/server/principal";
import {
  findDispatcherBoard,
  findDispatchers,
  findShipmentDetail,
  findStatusBoard,
  findSyncStates,
  listShipments,
} from "@/server/shipments";

// Every action: authenticate, validate, delegate. The session check comes first so an
// anonymous caller learns nothing from validation errors. `now` is read after the request.

export async function getStatusBoard(input: z.input<typeof shipmentFilterSchema>) {
  await requirePrincipal();
  const filter = parseActionInput(shipmentFilterSchema, input);
  return findStatusBoard(filter, new Date());
}

export async function listShipmentsPage(input: z.input<typeof shipmentPageInputSchema>) {
  await requirePrincipal();
  const pageInput = parseActionInput(shipmentPageInputSchema, input);
  return listShipments(pageInput, new Date());
}

export async function getDispatcherBoard() {
  await requirePrincipal();
  return findDispatcherBoard(new Date());
}

export async function getShipmentDetail(input: z.input<typeof shipmentDetailInputSchema>) {
  await requirePrincipal();
  const { id } = parseActionInput(shipmentDetailInputSchema, input);
  return findShipmentDetail(id, new Date());
}

export async function listDispatchers() {
  await requirePrincipal();
  return findDispatchers();
}

export async function getSyncStates() {
  await requirePrincipal();
  return findSyncStates();
}
