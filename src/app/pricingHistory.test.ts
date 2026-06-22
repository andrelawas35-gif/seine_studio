import { describe, expect, it } from "vitest";
import { createPricingVersion, parseTrackerCsv } from "./pricingHistory";

describe("pricing history", () => {
  it("appends a version without mutating its source snapshot", () => {
    const snapshot = { pieceName: "Ring", projectId: "P1", clientName: "Ana", input: { lines: [], markup: { type: "fixed" as const, amountCentavos: 1000 }, discountCentavos: 0 } };
    const first = createPricingVersion([], snapshot, new Date("2026-06-21T00:00:00Z"));
    const second = createPricingVersion([first], snapshot, new Date("2026-06-22T00:00:00Z"));
    expect([first.version, second.version]).toEqual([1, 2]);
    expect(first.createdAt).not.toBe(second.createdAt);
  });

  it("stages tracker blocks and flags invalid formulas", () => {
    const csv = "Item / Task,Qty / Hours,Unit Cost (₱),Total Cost (₱),,Carlo,,,,\nLabor (hours),5,500,2500,,Pearls,,550,1,#VALUE!\nDesign Fee,1,100,100,,,,,,\nBrand Value Markup,1,1700,1700,,,,,,\n,,TOTAL PRICE,4300,,,,,,";
    const [block] = parseTrackerCsv(csv);
    expect(block.name).toBe("Carlo");
    expect(block.lines).toHaveLength(3);
    expect(block.warnings.join(" ")).toContain("#VALUE!");
  });
});
