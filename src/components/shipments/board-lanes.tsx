"use client";

import { Select, SelectItem } from "@carbon/react";
import { useState, type ReactNode } from "react";
import type { ShipmentStatus } from "@/generated/prisma/enums";
import { boardStatuses } from "@/lib/shipments/status";

export type BoardLane = { status: ShipmentStatus; label: string; content: ReactNode };

/**
 * The lanes of the status board. Below md only the picked lane is shown, chosen in a select
 * above it, so a phone never scrolls sideways; from md up every lane is shown.
 */
export function BoardLanes({ lanes, className }: { lanes: BoardLane[]; className: string }) {
  const [picked, setPicked] = useState<ShipmentStatus>(boardStatuses[0]);

  return (
    <>
      <Select
        id="board-lane"
        labelText="Oszlop"
        className="md:hidden"
        value={picked}
        onChange={(event) => {
          const lane = lanes.find(({ status }) => status === event.target.value);
          if (lane === undefined) {
            throw new Error(`Lane picker reported an unknown lane ${event.target.value}`);
          }
          setPicked(lane.status);
        }}
      >
        {lanes.map(({ status, label }) => (
          <SelectItem key={status} value={status} text={label} />
        ))}
      </Select>
      <div className={className}>
        {lanes.map(({ status, content }) => (
          <div key={status} className={status === picked ? "contents" : "contents max-md:hidden"}>
            {content}
          </div>
        ))}
      </div>
    </>
  );
}
