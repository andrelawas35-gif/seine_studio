import { describe, expect, it } from "vitest";
import { resolveAllowedRole } from "./auth";

const env = {
  OWNER_EMAIL: "owner@seinestudio.ph",
  DEVELOPER_EMAIL: "developer@seinestudio.ph",
};

describe("two-user allowlist", () => {
  it("normalizes the owner email", () => {
    expect(resolveAllowedRole(" OWNER@SEINESTUDIO.PH ", env)).toBe("owner");
  });

  it("assigns the developer role", () => {
    expect(resolveAllowedRole("developer@seinestudio.ph", env)).toBe("developer");
  });

  it("rejects every other authenticated account", () => {
    expect(resolveAllowedRole("someone@example.com", env)).toBeNull();
  });
});
