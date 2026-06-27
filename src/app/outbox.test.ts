import { describe, expect, it } from "vitest";
import { summarizeOutbox } from "./db";

describe("outbox states", () => {
  it("keeps conflicts distinct from retryable failures", () => {
    const base = {
      method: "PATCH" as const,
      path: "/clients/id",
      body: null,
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z",
      attempts: 1,
      lastError: null,
    };
    expect(
      summarizeOutbox([
        { ...base, id: "1", status: "pending" },
        { ...base, id: "2", status: "conflict" },
        { ...base, id: "3", status: "failed" },
      ]),
    ).toEqual({ pending: 1, conflicts: 1, failed: 1 });
  });
});
