import { describe, expect, it } from "vitest";
import { clientIdParam, clientListQuery, createClientInput, updateClientInput } from "./input";

describe("client input validation", () => {
  it("normalizes optional values and Instagram handles", () => {
    expect(
      createClientInput.parse({
        name: "  Camille D. ",
        email: "",
        instagramHandle: "@camille",
      }),
    ).toEqual({
      name: "Camille D.",
      email: undefined,
      phone: undefined,
      instagramHandle: "camille",
      preferences: undefined,
      notes: undefined,
    });
  });

  it("rejects invalid contact email", () => {
    expect(() => createClientInput.parse({ name: "Camille", email: "not-an-email" })).toThrow();
  });

  it("caps list page size", () => {
    expect(() => clientListQuery.parse({ limit: "101" })).toThrow();
  });

  it("requires an update field", () => {
    expect(() => updateClientInput.parse({})).toThrow("At least one client field is required");
  });

  it("requires UUID route identifiers", () => {
    expect(() => clientIdParam.parse("C001")).toThrow("Client ID is invalid");
  });
});
