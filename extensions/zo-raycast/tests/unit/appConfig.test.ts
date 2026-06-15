import { beforeEach, describe, expect, it } from "vitest";
import { __setPreferenceValues } from "../stubs/raycastApi";
import { AppConfigManager } from "../../src/core/config/AppConfig";

describe("AppConfigManager", () => {
  beforeEach(() => {
    __setPreferenceValues({});
  });

  it("defaults chat streaming to false when preference is missing", () => {
    __setPreferenceValues({
      zoApiKey: "sk-test",
      zoApiBaseUrl: "https://api.zo.computer",
      requestTimeoutMs: "30000",
      maxRetries: "2",
    });

    const config = AppConfigManager.getConfig();
    expect(config.enableChatStreaming).toBe(false);
  });

  it("reads explicit chat streaming preference when enabled", () => {
    __setPreferenceValues({
      zoApiKey: "sk-test",
      zoApiBaseUrl: "https://api.zo.computer",
      requestTimeoutMs: "30000",
      maxRetries: "2",
      enableChatStreaming: true,
    });

    const config = AppConfigManager.getConfig();
    expect(config.enableChatStreaming).toBe(true);
  });

  it("falls back to default base URL when preference is blank", () => {
    __setPreferenceValues({
      zoApiKey: "sk-test",
      zoApiBaseUrl: "   ",
      requestTimeoutMs: "30000",
      maxRetries: "2",
      enableChatStreaming: false,
    });

    const config = AppConfigManager.getConfig();
    expect(config.zoApiBaseUrl).toBe("https://api.zo.computer");
  });
});
