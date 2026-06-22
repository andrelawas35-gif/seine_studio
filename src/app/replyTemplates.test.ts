import { describe, expect, it } from "vitest";
import { extractTemplateVariables, renderReplyTemplate } from "./replyTemplates";

describe("reply template rendering", () => {
  it("populates approved variables without changing the source", () => {
    const source = "Hi {{client_name}}, a {{piece_type}} starts at {{starting_price}}.";
    const rendered = renderReplyTemplate(source, {
      client_name: "Ana",
      piece_type: "ring",
      starting_price: "PHP 20,000",
    });

    expect(rendered.text).toBe("Hi Ana, a ring starts at PHP 20,000.");
    expect(rendered.missingVariables).toEqual([]);
    expect(source).toContain("{{client_name}}");
  });

  it("marks and reports missing values", () => {
    const rendered = renderReplyTemplate("Hi {{client_name}}, ready in {{lead_time}}.", { client_name: "" });

    expect(rendered.text).toBe("Hi [client name needed], ready in [lead time needed].");
    expect(rendered.missingVariables).toEqual(["client_name", "lead_time"]);
  });

  it("deduplicates repeated variables", () => {
    expect(extractTemplateVariables("{{client_name}} / {{ client_name }}")).toEqual(["client_name"]);
  });
});
