import { describe, expect, it } from "vitest";
import { clientToForm, fixtureClientToRecord } from "./clients";

const TEST_CLIENT = {
  id: "C001",
  name: "Test Client",
  email: "test@example.com",
  phone: "+63 900 000 0000",
  location: "Manila",
  notes: "Test notes.",
  totalSpent: 10000,
  since: "January 2025",
  projects: ["P001"],
};

describe("client view models", () => {
  it("labels fixture records explicitly", () => {
    const record = fixtureClientToRecord(TEST_CLIENT);
    expect(record.source).toBe("fixture");
    expect(record.preferences).toBe("Manila");
  });

  it("converts null API values into editable form strings", () => {
    const form = clientToForm({
      ...fixtureClientToRecord(TEST_CLIENT),
      email: null,
      instagramHandle: null,
    });
    expect(form.email).toBe("");
    expect(form.instagramHandle).toBe("");
  });
});
