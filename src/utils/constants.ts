import { EditorType, TransportType } from "../types/mcpServer";
import { homedir } from "os";
import { join } from "path";

export interface EditorConfig {
  id: EditorType;
  name: string;
  displayName: string;
  icon: string;
  supportedTransports: TransportType[];
  configPaths: {
    global?: string;
    workspace?: string;
    user?: string;
  };
  configFileName: string;
  supportsInputs: boolean;
  maxTools?: number;
  specificFeatures: {
    autoRun?: boolean;
    imageSupport?: boolean;
    toolsEnabled?: boolean;
    isOfficialPlugin?: boolean;
    envFile?: boolean;
    roots?: boolean;
  };
  description: string;
}

const getHomePath = (relativePath: string): string => {
  return join(homedir(), relativePath);
};

export const EDITOR_CONFIGS: Record<EditorType, EditorConfig> = {
  cursor: {
    id: "cursor",
    name: "cursor",
    displayName: "Cursor",
    icon: "../assets/cursor-icon.png",
    supportedTransports: ["stdio", "sse"],
    configPaths: {
      global: getHomePath(".cursor/mcp.json"),
      workspace: ".cursor/mcp.json",
    },
    configFileName: "mcp.json",
    supportsInputs: false,
    specificFeatures: {
      // Note: Cursor does not support server-level specific configuration options
    },
    description: "AI-powered code editor with MCP support for stdio and SSE transports",
  },
  windsurf: {
    id: "windsurf",
    name: "windsurf",
    displayName: "Windsurf (Cascade)",
    icon: "../assets/windsurf-icon.png",
    supportedTransports: ["stdio", "/sse"],
    configPaths: {
      global: getHomePath(".codeium/windsurf/mcp_config.json"),
    },
    configFileName: "mcp_config.json",
    supportsInputs: false,
    maxTools: 100,
    specificFeatures: {
      toolsEnabled: true,
      isOfficialPlugin: true,
    },
    description: "Codeium's AI editor with Claude Desktop compatible MCP configuration",
  },
  vscode: {
    id: "vscode",
    name: "vscode",
    displayName: "VS Code",
    icon: "../assets/vscode-icon.png",
    supportedTransports: ["stdio", "sse", "http"],
    configPaths: {
      workspace: ".vscode/mcp.json",
      user: getPlatformSpecificVSCodeSettingsPath(),
    },
    configFileName: "mcp.json",
    supportsInputs: true,
    specificFeatures: {
      envFile: true,
      roots: true,
    },
    description: "Microsoft's Visual Studio Code with comprehensive MCP support including HTTP transport",
  },
};

function getPlatformSpecificVSCodeSettingsPath(): string {
  const platform = process.platform;
  switch (platform) {
    case "darwin":
      return getHomePath("Library/Application Support/Code/User/settings.json");
    case "win32":
      return join(process.env.APPDATA || "", "Code", "User", "settings.json");
    case "linux":
      return getHomePath(".config/Code/User/settings.json");
    default:
      return getHomePath(".config/Code/User/settings.json");
  }
}

export function getEditorConfig(editorType: EditorType): EditorConfig {
  return EDITOR_CONFIGS[editorType];
}
export function getAllEditorTypes(): EditorType[] {
  return Object.keys(EDITOR_CONFIGS) as EditorType[];
}

export function getEditorsWithTransport(transport: TransportType): EditorConfig[] {
  return Object.values(EDITOR_CONFIGS).filter((config) => config.supportedTransports.includes(transport));
}
export const VALIDATION_RULES = {
  ENV_VAR_KEY_PATTERN: /^[A-Z0-9_]+$/,
  SERVER_NAME_PATTERN: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  URL_PATTERNS: {
    HTTP: /^https?:\/\/.+/,
    SSE: /^https?:\/\/.+/,
  },
  VSCODE_VARIABLE_PATTERNS: {
    INPUT_VAR: /\$\{input:[a-zA-Z][a-zA-Z0-9_-]*\}/g,
    WORKSPACE_FOLDER: /\$\{workspaceFolder\}/g,
  },
  MAX_LENGTHS: {
    SERVER_NAME: 50,
    DESCRIPTION: 200,
    COMMAND: 500,
    URL: 2048,
    ENV_VAR_VALUE: 1000,
  },
  WINDSURF_MAX_TOOLS: 100,
} as const;

export const DEFAULT_SERVER_VALUES = {
  cursor: {
    // Note: Cursor does not support server-level specific configuration options
  },
  windsurf: {
    maxTools: 100,
    toolsEnabled: true,
    isOfficialPlugin: false,
  },
  vscode: {
    inputs: [],
  },
} as const;

export const ERROR_CODES = {
  REQUIRED_FIELD: "REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",
  INVALID_TRANSPORT: "INVALID_TRANSPORT",
  INVALID_URL: "INVALID_URL",
  INVALID_ENV_VAR: "INVALID_ENV_VAR",
  EXCEEDS_MAX_LENGTH: "EXCEEDS_MAX_LENGTH",
  EXCEEDS_MAX_TOOLS: "EXCEEDS_MAX_TOOLS",
  DUPLICATE_SERVER_NAME: "DUPLICATE_SERVER_NAME",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  INVALID_JSON: "INVALID_JSON",
  SCHEMA_VALIDATION: "SCHEMA_VALIDATION",
  INVALID_INPUT_REFERENCE: "INVALID_INPUT_REFERENCE",
} as const;

export const SUCCESS_MESSAGES = {
  SERVER_ADDED: "MCP server added successfully",
  SERVER_UPDATED: "MCP server updated successfully",
  SERVER_DELETED: "MCP server deleted successfully",
  SERVER_ENABLED: "MCP server enabled",
  SERVER_DISABLED: "MCP server disabled",
  CONNECTION_SUCCESS: "Connection test successful",
  VALIDATION_SUCCESS: "All configurations are valid",
} as const;
