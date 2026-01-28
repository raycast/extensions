import { BaseProvider } from "./base-provider";
import { UsageData, ProviderCapabilities } from "../types";
import { getProviderConfig } from "../utils/storage";
import { handleFetchError } from "../utils/fetcher";
import { detectCLITool } from "../auth/cli-detector";
import { getProviderCookie } from "../auth/cookie-extractor";

export class AugmentProvider extends BaseProvider {
  readonly id = "augment";
  readonly name = "Augment";
  readonly icon = "augment-icon.png";
  readonly defaultEnabled = false;

  readonly capabilities: ProviderCapabilities = {
    supportsSession: true,
    supportsWeekly: true,
    supportsResetTime: true,
    supportsCost: true,
    authMethods: ["cli", "cookies"],
  };

  private cliAvailable = false;
  private sessionCookie: string | null = null;

  async isConfigured(): Promise<boolean> {
    const config = getProviderConfig(this.id);
    return config?.enabled ?? this.defaultEnabled;
  }

  async isAuthenticated(): Promise<boolean> {
    // Try CLI first
    const cli = await detectCLITool("auggie");
    if (cli.found) {
      this.cliAvailable = true;
      return true;
    }

    // Try manual cookie from preferences
    const cookie = getProviderCookie(this.id);
    if (cookie) {
      this.sessionCookie = cookie;
      return true;
    }

    return false;
  }

  async fetchUsage(): Promise<UsageData> {
    try {
      this.updateStatus("configured");

      if (this.cliAvailable) {
        // Augment CLI (auggie) doesn't have a usage command yet
        throw new Error(
          "Augment CLI detected. Usage tracking not yet available via CLI. " +
          "Check usage at https://augmentcode.com"
        );
      }

      if (this.sessionCookie) {
        throw new Error(
          "Augment web session detected. " +
          "Usage tracking via cookies not yet implemented."
        );
      }

      throw new Error("Augment not authenticated. Run 'auggie login' or add session cookie in settings.");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.setError(err);
      handleFetchError(err, this.name);
      throw err;
    }
  }

  async authenticate(): Promise<boolean> {
    // Try CLI first
    const cli = await detectCLITool("auggie");
    if (cli.found) {
      this.cliAvailable = true;
      this.updateStatus("authenticated");
      return true;
    }

    // Try cookie
    const cookieAuth = await this.isAuthenticated();
    if (cookieAuth) {
      this.updateStatus("authenticated");
      return true;
    }

    return false;
  }

  async disconnect(): Promise<void> {
    this.cliAvailable = false;
    this.sessionCookie = null;
    this.usageData = null;
    this.updateStatus("not_configured");
  }
}
