import { BaseProvider } from "./base-provider";
import { UsageData, ProviderCapabilities } from "../types";
import { getProviderConfig } from "../utils/storage";
import { getProviderCookie } from "../auth/cookie-extractor";
import { handleFetchError } from "../utils/fetcher";

export class DroidProvider extends BaseProvider {
  readonly id = "droid";
  readonly name = "Droid/Factory";
  readonly icon = "droid-icon.png";
  readonly defaultEnabled = false;

  readonly capabilities: ProviderCapabilities = {
    supportsSession: true,
    supportsWeekly: true,
    supportsResetTime: true,
    supportsCost: true,
    authMethods: ["cookies"],
  };

  private sessionCookie: string | null = null;

  async isConfigured(): Promise<boolean> {
    const config = getProviderConfig(this.id);
    return config?.enabled ?? this.defaultEnabled;
  }

  async isAuthenticated(): Promise<boolean> {
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

      if (!this.sessionCookie) {
        const authenticated = await this.isAuthenticated();
        if (!authenticated) {
          throw new Error("Not authenticated. Add session cookie in settings.");
        }
      }

      // Droid/Factory uses WorkOS token flows
      throw new Error(
        "Factory API integration pending. Check usage at factory.ai"
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.setError(err);
      handleFetchError(err, this.name);
      throw err;
    }
  }

  async authenticate(): Promise<boolean> {
    const authenticated = await this.isAuthenticated();
    if (authenticated) {
      this.updateStatus("authenticated");
    }
    return authenticated;
  }

  async disconnect(): Promise<void> {
    this.sessionCookie = null;
    this.usageData = null;
    this.updateStatus("not_configured");
  }
}
