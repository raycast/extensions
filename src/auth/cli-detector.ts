import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as fs from "fs";

const execAsync = promisify(exec);

export interface CLIDetectionResult {
  found: boolean;
  path?: string;
  version?: string;
}

// CLI tool configurations
export interface CLIToolConfig {
  name: string;
  commands: string[];
  windowsPaths: string[];
  macPaths: string[];
  linuxPaths: string[];
  versionCommand: string;
}

export const CLI_TOOLS: Record<string, CLIToolConfig> = {
  codex: {
    name: "OpenAI Codex",
    commands: ["codex", "codex.exe"],
    windowsPaths: [
      "%APPDATA%/npm/codex.cmd",
      "%USERPROFILE%/.npm-global/codex.cmd",
      "%LOCALAPPDATA%/Programs/codex/codex.exe",
    ],
    macPaths: [
      "/usr/local/bin/codex",
      "/opt/homebrew/bin/codex",
      "~/.local/bin/codex",
      "~/.npm-global/bin/codex",
    ],
    linuxPaths: ["/usr/local/bin/codex", "~/.local/bin/codex", "~/.npm-global/bin/codex"],
    versionCommand: "codex --version",
  },
  claude: {
    name: "Claude Code",
    commands: ["claude", "claude.exe"],
    windowsPaths: [
      "%LOCALAPPDATA%/AnthropicClaude/claude.exe",
      "%APPDATA%/npm/claude.cmd",
      "%USERPROFILE%/.npm-global/claude.cmd",
    ],
    macPaths: [
      "/usr/local/bin/claude",
      "/opt/homebrew/bin/claude",
      "~/.local/bin/claude",
      "~/.npm-global/bin/claude",
    ],
    linuxPaths: ["/usr/local/bin/claude", "~/.local/bin/claude", "~/.npm-global/bin/claude"],
    versionCommand: "claude --version",
  },
  kiro: {
    name: "Kiro",
    commands: ["kiro", "kiro.exe"],
    windowsPaths: ["%LOCALAPPDATA%/Kiro/kiro.exe", "%LOCALAPPDATA%/Programs/kiro/kiro.exe"],
    macPaths: ["/usr/local/bin/kiro", "/opt/homebrew/bin/kiro", "~/.local/bin/kiro"],
    linuxPaths: ["/usr/local/bin/kiro", "~/.local/bin/kiro"],
    versionCommand: "kiro --version",
  },
  augment: {
    name: "Augment",
    commands: ["auggie", "auggie.exe"],
    windowsPaths: [
      "%LOCALAPPDATA%/Augment/auggie.exe",
      "%LOCALAPPDATA%/Programs/augment/auggie.exe",
    ],
    macPaths: ["/usr/local/bin/auggie", "/opt/homebrew/bin/auggie", "~/.local/bin/auggie"],
    linuxPaths: ["/usr/local/bin/auggie", "~/.local/bin/auggie"],
    versionCommand: "auggie --version",
  },
};

function expandPath(filePath: string): string {
  return filePath
    .replace(/^~/, os.homedir())
    .replace(/%LOCALAPPDATA%/g, process.env.LOCALAPPDATA || "")
    .replace(/%APPDATA%/g, process.env.APPDATA || "")
    .replace(/%USERPROFILE%/g, os.homedir());
}

export async function detectCLITool(toolId: string): Promise<CLIDetectionResult> {
  const tool = CLI_TOOLS[toolId];
  if (!tool) {
    return { found: false };
  }

  const platform = os.platform();
  let searchPaths: string[] = [];

  if (platform === "win32") {
    searchPaths = tool.windowsPaths.map(expandPath);
  } else if (platform === "darwin") {
    searchPaths = tool.macPaths.map(expandPath);
  } else {
    searchPaths = tool.linuxPaths.map(expandPath);
  }

  // Check if command exists in PATH
  try {
    const command =
      platform === "win32" ? `where ${tool.commands[0]}` : `which ${tool.commands[0]}`;
    const { stdout } = await execAsync(command);
    if (stdout.trim()) {
      return {
        found: true,
        path: stdout.trim().split("\n")[0],
      };
    }
  } catch {
    // Command not in PATH, check specific paths
  }

  // Check specific installation paths
  for (const searchPath of searchPaths) {
    try {
      if (fs.existsSync(searchPath)) {
        return {
          found: true,
          path: searchPath,
        };
      }
    } catch {
      // Path doesn't exist
    }
  }

  return { found: false };
}

export async function runCLICommand(
  toolId: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const detection = await detectCLITool(toolId);
  if (!detection.found) {
    throw new Error(`CLI tool ${toolId} not found`);
  }

  const command = detection.path || CLI_TOOLS[toolId].commands[0];
  const fullCommand = `"${command}" ${args.join(" ")}`;

  return execAsync(fullCommand);
}

export async function getCLIVersion(toolId: string): Promise<string | undefined> {
  const tool = CLI_TOOLS[toolId];
  if (!tool) return undefined;

  try {
    const { stdout } = await execAsync(tool.versionCommand);
    return stdout.trim();
  } catch {
    return undefined;
  }
}
