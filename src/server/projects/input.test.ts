import { describe, expect, it } from "vitest";
import { updateProjectInput } from "./input";

describe("project update validation", () => {
  it("preserves the expected server version used for conflict detection", () => {
    expect(
      updateProjectInput.parse({
        title: "Revised commission",
        expectedUpdatedAt: "2026-06-22T12:00:00.000Z",
      }),
    ).toMatchObject({
      title: "Revised commission",
      expectedUpdatedAt: "2026-06-22T12:00:00.000Z",
    });
  });

  it("rejects malformed version timestamps", () => {
    expect(() => updateProjectInput.parse({ title: "Project", expectedUpdatedAt: "yesterday" })).toThrow();
  });
});
