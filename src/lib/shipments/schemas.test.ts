import { describe, expect, it } from "vitest";
import {
  dispatchersHref,
  dispatchersSearchParamsSchema,
  shipmentsHref,
  shipmentsSearchParamsSchema,
  type ShipmentsSearchParams,
} from "@/lib/shipments/schemas";

const dispatcherId = "01a130c5-1065-71bb-9290-0d422f931532";

function searchParams(href: string) {
  return Object.fromEntries(new URL(href, "http://localhost").searchParams);
}

describe("shipments URL", () => {
  it("parses back to the state it was built from", () => {
    const states: ShipmentsSearchParams[] = [
      { view: "kanban", filter: { pickupWithin24h: false } },
      { view: "table", filter: { dispatcherId, pickupWithin24h: true } },
    ];
    for (const state of states) {
      expect(shipmentsSearchParamsSchema.parse(searchParams(shipmentsHref(state)))).toEqual({
        view: state.view,
        filter: {
          dispatcherId: state.filter.dispatcherId,
          pickupWithin24h: state.filter.pickupWithin24h,
        },
      });
    }
  });

  it("leaves defaults out of the URL", () => {
    expect(shipmentsHref({ view: "kanban", filter: { pickupWithin24h: false } })).toBe(
      "/shipments",
    );
  });

  it("rejects values the screen does not know", () => {
    expect(shipmentsSearchParamsSchema.safeParse({ view: "list" }).success).toBe(false);
    expect(shipmentsSearchParamsSchema.safeParse({ dispatcher: "kiss-bela" }).success).toBe(false);
  });
});

describe("dispatchers URL", () => {
  it("parses back to the focused dispatcher", () => {
    expect(
      dispatchersSearchParamsSchema.parse(searchParams(dispatchersHref(dispatcherId))),
    ).toEqual({ dispatcher: dispatcherId });
  });
});
