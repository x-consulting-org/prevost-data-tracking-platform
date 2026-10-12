import { describe, expect, it } from "vitest";
import { fitColumnSize, sortActionLabel } from "@/lib/data-table";

describe("fitColumnSize", () => {
  const limits = { chrome: 32, minSize: 100, maxSize: 240 };

  it("fits the widest of header and cells plus chrome", () => {
    expect(fitColumnSize({ ...limits, headerWidth: 60, cellWidths: [80, 150.2, 90] })).toBe(183);
    expect(fitColumnSize({ ...limits, headerWidth: 170, cellWidths: [80] })).toBe(202);
  });

  it("never goes below the minimum or above the maximum", () => {
    expect(fitColumnSize({ ...limits, headerWidth: 20, cellWidths: [] })).toBe(100);
    expect(fitColumnSize({ ...limits, headerWidth: 60, cellWidths: [900] })).toBe(240);
  });
});

describe("sortActionLabel", () => {
  it("names the order the next click applies", () => {
    expect(sortActionLabel("Megbízó", "asc")).toBe("Rendezés Megbízó szerint, növekvő sorrendben");
    expect(sortActionLabel("Megbízó", "desc")).toBe(
      "Rendezés Megbízó szerint, csökkenő sorrendben",
    );
    expect(sortActionLabel("Megbízó", false)).toBe("Megbízó szerinti rendezés megszüntetése");
  });
});
