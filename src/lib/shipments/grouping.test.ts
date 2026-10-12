import { describe, expect, it } from "vitest";
import { ShipmentStatus } from "@/generated/prisma/enums";
import type { ShipmentAlert } from "@/lib/shipments/alerts";
import { groupByDispatcher, groupByStatus } from "@/lib/shipments/grouping";

const alert: ShipmentAlert = { kind: "missing_schedule" };

function shipment(id: string, status: ShipmentStatus, dispatcherId = "d1", alerts = [alert]) {
  return { id, status, dispatcherId, alerts };
}

describe("groupByStatus", () => {
  it("returns every board column in order, keeping input order inside a column", () => {
    const columns = groupByStatus([
      shipment("a", ShipmentStatus.IN_TRANSIT),
      shipment("b", ShipmentStatus.UNHANDLED, "d1", []),
      shipment("c", ShipmentStatus.IN_TRANSIT, "d1", []),
    ]);

    expect(columns.map((column) => column.status)).toEqual([
      ShipmentStatus.UNHANDLED,
      ShipmentStatus.ORGANIZING,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.COMPLETED,
    ]);
    expect(columns[2].shipments.map((s) => s.id)).toEqual(["a", "c"]);
    expect(columns.map((column) => column.attentionCount)).toEqual([0, 0, 1, 0]);
  });

  it("puts cancelled shipments in no column", () => {
    const columns = groupByStatus([shipment("x", ShipmentStatus.CANCELLED)]);

    expect(columns.every((column) => column.shipments.length === 0)).toBe(true);
  });
});

describe("groupByDispatcher", () => {
  it("keeps a dispatcher without shipments as an empty column", () => {
    const columns = groupByDispatcher(
      [{ id: "d1" }, { id: "d2" }],
      [
        shipment("a", ShipmentStatus.ORGANIZING, "d1"),
        shipment("b", ShipmentStatus.UNHANDLED, "d1", []),
      ],
    );

    expect(
      columns.map((column) => [column.dispatcher.id, column.shipmentCount, column.attentionCount]),
    ).toEqual([
      ["d1", 2, 1],
      ["d2", 0, 0],
    ]);
  });
});
