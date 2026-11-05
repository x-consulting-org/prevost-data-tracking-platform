import { describe, expect, it } from "vitest";
import { ShipmentStatus } from "@/generated/prisma/enums";
import type { ShipmentAlert } from "@/lib/shipments/alerts";
import { groupByStatus } from "@/lib/shipments/grouping";
import { boardStatuses, boardStatusesFor } from "@/lib/shipments/status";

const alert: ShipmentAlert = { kind: "missing_schedule" };

function shipment(id: string, status: ShipmentStatus, alerts = [alert]) {
  return { id, status, alerts };
}

describe("groupByStatus", () => {
  it("returns every board column in order, keeping input order inside a column", () => {
    const columns = groupByStatus(
      [
        shipment("a", ShipmentStatus.IN_TRANSIT),
        shipment("b", ShipmentStatus.UNHANDLED, []),
        shipment("c", ShipmentStatus.IN_TRANSIT, []),
      ],
      boardStatuses,
    );

    expect(columns.map((column) => column.status)).toEqual([
      ShipmentStatus.UNHANDLED,
      ShipmentStatus.ORGANIZING,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.COMPLETED,
    ]);
    expect(columns[2].shipments.map((s) => s.id)).toEqual(["a", "c"]);
    expect(columns.map((column) => column.attentionCount)).toEqual([0, 0, 1, 0]);
  });

  it("puts cancelled shipments in no column unless asked for", () => {
    const cancelled = [shipment("x", ShipmentStatus.CANCELLED)];

    expect(
      groupByStatus(cancelled, boardStatusesFor({ includeCancelled: false })).every(
        (column) => column.shipments.length === 0,
      ),
    ).toBe(true);
    expect(
      groupByStatus(cancelled, boardStatusesFor({ includeCancelled: true })).at(-1),
    ).toMatchObject({ status: ShipmentStatus.CANCELLED, shipments: cancelled });
  });
});
