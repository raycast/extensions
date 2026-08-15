import { describe, expect, it } from "vitest";
import { redactSensitiveValues } from "../../src/core/activity/redaction";

describe("redactSensitiveValues", () => {
  it("redacts secret-looking keys recursively", () => {
    const output = redactSensitiveValues({
      apiKey: "abc123",
      nested: {
        authToken: "xyz",
        keep: "value",
      },
    });

    expect(output).toEqual({
      apiKey: "[REDACTED]",
      nested: {
        authToken: "[REDACTED]",
        keep: "value",
      },
    });
  });
});
