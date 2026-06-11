import { AppConfigManager } from "../config/AppConfig";

export class AuthManager {
  static getApiKey(): string {
    return AppConfigManager.getConfig().apiKey;
  }

  static hasValidApiKey(): boolean {
    return AuthManager.getApiKey().length > 0;
  }
}
