import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

describe("server environment validation", () => {
  it("normalizes allowlist emails", () => {
    expect(
      parseServerEnv({
        DATABASE_URL: "postgresql://user:password@example.com/seine",
        NEON_AUTH_URL: "https://example.com/neondb/auth",
        OWNER_EMAIL: "OWNER@EXAMPLE.COM",
        DEVELOPER_EMAIL: "DEV@EXAMPLE.COM",
      }),
    ).toMatchObject({ OWNER_EMAIL: "owner@example.com", DEVELOPER_EMAIL: "dev@example.com" });
  });

  it("rejects a browser-style database URL", () => {
    expect(() =>
      parseServerEnv({
        DATABASE_URL: "https://example.com/database",
        NEON_AUTH_URL: "https://example.com/neondb/auth",
        OWNER_EMAIL: "owner@example.com",
        DEVELOPER_EMAIL: "dev@example.com",
      }),
    ).toThrow("Server configuration is invalid");
  });
});
