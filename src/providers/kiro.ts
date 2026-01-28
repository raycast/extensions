import { exec } from "child_process";
import { promisify } from "util";
import { Provider, UsageData } from "./types";

const execAsync = promisify(exec);

export class KiroProvider implements Provider {
  id = "kiro";
  name = "Kiro";
  icon = "🔧";
  description = "AWS Kiro (KI) usage";

  private cliAvailable = false;

  async isConfigured(): Promise<boolean> {
    try {
      await execAsync("which kiro-cli");
      this.cliAvailable = true;
      return true;
    } catch {
      return false;
    }
  }

  async fetchUsage(): Promise<UsageData> {
    if (!this.cliAvailable) {
      throw new Error("Kiro CLI not found. Install with: npm install -g @aws/kiro-cli");
    }

    try {
      // Run kiro-cli with usage command
      const { stdout } = await execAsync('kiro-cli chat --no-interactive "/usage"', {
        timeout: 15000,
      });

      return this.parseUsageOutput(stdout);
    } catch (error) {
      throw new Error(`Failed to get Kiro usage: ${error}`);
    }
  }

  private parseUsageOutput(output: string): UsageData {
    // Parse ANSI-stripped output looking for usage info
    // Example output format (with ANSI codes):
    // Plan: Pro
    // Monthly credits: 45% used (450/1000)
    // Bonus credits: 10 remaining

    const lines = output.split("\n");

    let plan = "Unknown";
    let used = 0;
    let limit = 100;
    let bonusRemaining = 0;

    for (const line of lines) {
      // eslint-disable-next-line no-control-regex
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "").trim();

      // Look for plan
      const planMatch = cleanLine.match(/Plan:\s*(.+)/i);
      if (planMatch) {
        plan = planMatch[1].trim();
      }

      // Look for monthly credits: "45% used (450/1000)" or similar
      const usageMatch = cleanLine.match(/(\d+)%\s*used\s*\(?\s*(\d+)\s*\/\s*(\d+)\s*\)?/i);
      if (usageMatch) {
        used = parseInt(usageMatch[2], 10);
        limit = parseInt(usageMatch[3], 10);
      }

      // Alternative: just numbers
      const simpleMatch = cleanLine.match(/(\d+)\s*\/\s*(\d+)\s*(?:credits|requests|used)/i);
      if (simpleMatch && used === 0) {
        used = parseInt(simpleMatch[1], 10);
        limit = parseInt(simpleMatch[2], 10);
      }

      // Bonus credits
      const bonusMatch = cleanLine.match(/Bonus.*?(\d+)/i);
      if (bonusMatch) {
        bonusRemaining = parseInt(bonusMatch[1], 10);
      }
    }

    if (limit === 0) limit = 100; // Prevent division by zero

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used) + bonusRemaining,
      percentUsed: Math.round((used / limit) * 100),
      plan: bonusRemaining > 0 ? `${plan} (+${bonusRemaining} bonus)` : plan,
    };
  }

  getSetupInstructions(): string {
    return `To use Kiro:

1. Install Kiro CLI: npm install -g @aws/kiro-cli
2. Run: kiro-cli login (follow AWS Builder ID flow)
3. Ensure kiro-cli is in your PATH
4. The extension will detect it automatically

Note: The first usage check may take 10-15 seconds while the CLI initializes.`;
  }
}

export const kiroProvider = new KiroProvider();
