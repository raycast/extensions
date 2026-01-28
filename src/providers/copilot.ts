import { Provider, UsageData } from "./types";
import { getPreferenceValues } from "@raycast/api";

interface CopilotResponse {
  copilot_plan?: string;
  quota_snapshots?: {
    premium_interactions?: {
      current: number;
      limit: number;
      percent_remaining: number;
    };
    chat?: {
      current: number;
      limit: number;
      percent_remaining: number;
    };
  };
}

export class CopilotProvider implements Provider {
  id = "copilot";
  name = "GitHub Copilot";
  icon = "👨‍💻";
  description = "GitHub Copilot usage";
  
  private authToken: string | null = null;

  async isConfigured(): Promise<boolean> {
    const prefs = getPreferenceValues<{ copilotAuthToken?: string }>();
    if (prefs.copilotAuthToken?.trim()) {
      this.authToken = prefs.copilotAuthToken.trim();
      return true;
    }
    return false;
  }

  async fetchUsage(): Promise<UsageData> {
    if (!this.authToken) {
      throw new Error(
        "No Copilot authentication found. Please add your GitHub token in extension preferences."
      );
    }

    const response = await fetch("https://api.github.com/copilot_internal/user", {
      headers: {
        "Authorization": `token ${this.authToken}`,
        "Accept": "application/json",
        "Editor-Version": "vscode/1.96.2",
        "Editor-Plugin-Version": "copilot-chat/0.26.7",
        "User-Agent": "GitHubCopilotChat/0.26.7",
        "X-Github-Api-Version": "2025-04-01",
      },
    });

    if (!response.ok) {
      throw new Error(`Copilot API error: ${response.status}. Check your token.`);
    }

    const data = await response.json() as CopilotResponse;
    
    // Use premium_interactions as primary, fall back to chat
    const quota = data.quota_snapshots?.premium_interactions || data.quota_snapshots?.chat;
    
    if (!quota) {
      throw new Error("No usage quota data available");
    }

    const used = quota.current;
    const limit = quota.limit;
    const percentUsed = Math.round(((limit - quota.percent_remaining / 100 * limit) / limit) * 100);

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      percentUsed,
      plan: data.copilot_plan || "Copilot",
    };
  }

  getSetupInstructions(): string {
    return `To authenticate with GitHub Copilot:

1. Get a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select the 'read:user' scope
   - Generate and copy the token

2. Paste the token in extension preferences under "Copilot Auth Token"

Note: The token needs read:user scope to access Copilot usage data.`;
  }
}

export const copilotProvider = new CopilotProvider();
