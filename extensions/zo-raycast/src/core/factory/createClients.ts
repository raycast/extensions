import { AppConfigManager } from "../config/AppConfig";
import { ZoApiClient } from "../api/ZoApiClient";

export function createClients() {
  const config = AppConfigManager.getConfig();

  const apiClient = new ZoApiClient({
    baseUrl: config.zoApiBaseUrl,
    apiKey: config.apiKey,
    timeoutMs: config.requestTimeoutMs,
    maxRetries: config.maxRetries,
  });

  return {
    config,
    apiClient,
  };
}
