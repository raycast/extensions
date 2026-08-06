import { describe, it, expect } from "vitest";
import { isSecretName, maskValue, searchableValue, maskSecretsInContent } from "../utils/secrets";

describe("secrets.ts", () => {
  describe("isSecretName", () => {
    it.each([
      "OPENAI_API_KEY",
      "GITHUB_TOKEN",
      "MY_SECRET",
      "DB_PASSWORD",
      "SMTP_PASSWD",
      "AWS_CREDENTIALS",
      "OAUTH_TOKEN",
      "AUTH_HEADER",
      "PRIVATE_URL",
      "npm_token", // case-insensitive
      "TWELVE_DATA_API",
      "CURSOR_API",
    ])("treats %s as a secret", (name) => {
      expect(isSecretName(name)).toBe(true);
    });

    it.each(["PATH", "EDITOR", "NODE_ENV", "HOMEBREW_PREFIX", "LANG", "XDG_CONFIG_HOME", "GOPATH"])(
      "does not treat %s as a secret",
      (name) => {
        expect(isSecretName(name)).toBe(false);
      },
    );

    it("matches on the name, not the value shape", () => {
      // A path-looking name stays visible even if its value looks random
      expect(isSecretName("CACHE_DIR")).toBe(false);
    });
  });

  describe("maskValue", () => {
    it("shows first and last three characters of long values", () => {
      expect(maskValue("sk-abcdefghijklmnop")).toBe("sk-•••••nop");
    });

    it("fully masks values of eight characters or fewer", () => {
      expect(maskValue("hunter2")).toBe("••••••••");
      expect(maskValue("12345678")).toBe("••••••••");
      expect(maskValue("")).toBe("••••••••");
    });

    it("never contains the middle of the value", () => {
      const value = "sk-proj-SUPERSECRETMIDDLE-end";
      expect(maskValue(value)).not.toContain("SUPERSECRETMIDDLE");
    });
  });

  describe("searchableValue", () => {
    it("returns an empty string for secret names so filters cannot match the value", () => {
      expect(searchableValue("GITHUB_TOKEN", "fake-value-for-tests")).toBe("");
    });

    it("returns the value for non-secret names", () => {
      expect(searchableValue("EDITOR", "code")).toBe("code");
    });
  });

  describe("maskSecretsInContent", () => {
    it("masks secret export values and leaves everything else alone", () => {
      const content = [
        "# --- Env --- #",
        'export MY_TOKEN="abcdefghijklmnop"',
        "export EDITOR=vim",
        "alias gs='git status'",
      ].join("\n");

      const masked = maskSecretsInContent(content);
      expect(masked).not.toContain("abcdefghijklmnop");
      expect(masked).toContain("export MY_TOKEN=abc•••••nop");
      expect(masked).toContain("export EDITOR=vim");
      expect(masked).toContain("alias gs='git status'");
    });

    it("masks typeset -x definitions and preserves indentation", () => {
      const masked = maskSecretsInContent("  typeset -x API_KEY=abcdefghijklmnop");
      expect(masked).toBe("  typeset -x API_KEY=abc•••••nop");
    });

    it("masks bare assignments of secret-looking names", () => {
      const masked = maskSecretsInContent("MY_TOKEN=abcdefghijklmnop\nexport MY_TOKEN");
      expect(masked).not.toContain("abcdefghijklmnop");
      expect(masked).toContain("MY_TOKEN=abc•••••nop");
    });
  });
});
