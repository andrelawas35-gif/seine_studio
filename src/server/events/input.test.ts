import { describe, expect, it } from "vitest";
import { createEventAllocationInput, createEventInput } from "./input";

describe("event input", () => {
  it("normalizes optional event fields", () => {
    const input = createEventInput.parse({
      name: "Makati Weekend Pop-up",
      type: "Pop-up",
      organizer: "",
      venue: "Gallery",
      address: "",
      startsAt: "2026-08-01T10:00:00+08:00",
      endsAt: "2026-08-02T18:00:00+08:00",
      studioBufferPercent: 20,
      notes: "",
    });
    expect(input.organizer).toBeUndefined();
    expect(input.studioBufferPercent).toBe(20);
  });

  it("rejects an event ending before it starts", () => {
    expect(() =>
      createEventInput.parse({
        name: "Pop-up",
        type: "Market",
        startsAt: "2026-08-02T10:00:00+08:00",
        endsAt: "2026-08-01T10:00:00+08:00",
      }),
    ).toThrow();
  });

  it("accepts fractional stock pulls up to four decimals", () => {
    const input = createEventAllocationInput.parse({
      inventoryLotId: "11111111-1111-4111-8111-111111111111",
      sourceLocationId: "22222222-2222-4222-8222-222222222222",
      plannedQuantity: "2.5000",
    });
    expect(input.plannedQuantity).toBe("2.5000");
  });
});
