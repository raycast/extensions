import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { BaseEditorService, ServerFormSection } from "./BaseEditorService";
import {
  MCPServerConfig,
  MCPServerWithMetadata,
  ValidationResult,
  ValidationError,
  VSCodeMCPServerConfig,
  VSCodeWorkspaceConfig,
  VSCodeUserSettings,
  VSCodeInput,
  TransportType,
} from "../types/mcpServer";
import {
  EDITOR_CONFIGS,
  ERROR_CODES,
  VALIDATION_RULES,
} from "../utils/constants";
import {
  validateMCPServerConfig,
  validateJSONStructure,
} from "../utils/validation";
import { existsSync } from "fs";

const loggedMessages = new Set<string>();

function logOnce(message: string): void {
  if (!loggedMessages.has(message)) {
    console.log(message);
    loggedMessages.add(message);
  }
}

export class VSCodeEditorService extends BaseEditorService {
  constructor() {
    super(EDITOR_CONFIGS.vscode);
  }

  async readConfig(
    configType: "global" | "workspace" | "user" = "user",
  ): Promise<MCPServerWithMetadata[]> {
    if (configType === "global") {
      configType = "user";
    }

    const configPath = this.getConfigPath(configType);
    if (!configPath) {
      throw new Error(
        `Could not determine VS Code config path for ${configType}`,
      );
    }

    try {
      if (!existsSync(configPath)) {
        if (configType === "workspace") {
          const dir = dirname(configPath);
          const isValidWorkspace = this.isValidWorkspaceContext(dir);

          if (isValidWorkspace) {
            console.log(
              `VS Code workspace config file not found at ${configPath}, creating empty configuration`,
            );

            try {
              await mkdir(dir, { recursive: true });
              const emptyConfig = { servers: {} };
              await writeFile(
                configPath,
                JSON.stringify(emptyConfig, null, 2),
                "utf-8",
              );
            } catch (error) {
              console.warn(
                `Could not create VS Code workspace config at ${configPath}:`,
                error,
              );
            }
          } else {
            logOnce(
              `VS Code workspace config not found at ${configPath}, not creating (not in valid workspace context)`,
            );
          }
        } else {
          console.log(
            `VS Code user settings file not found at ${configPath}, returning empty configuration (not creating user settings)`,
          );
        }

        return [];
      }

      const fileContent = await readFile(configPath, "utf-8");

      if (!fileContent.trim()) {
        console.log(
          `VS Code config file is empty at ${configPath}, returning empty configuration`,
        );
        return [];
      }

      const { isValid, data, error } = validateJSONStructure(fileContent);

      if (!isValid) {
        throw new Error(`Invalid JSON in VS Code config file: ${error}`);
      }

      return this.parseConfigData(data, configType);
    } catch (error) {
      console.error(`Error reading VS Code ${configType} config:`, error);
      throw new Error(
        `Failed to read VS Code ${configType} configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  validateServerConfig(serverConfig: MCPServerConfig): ValidationResult {
    const result = validateMCPServerConfig(serverConfig, "vscode");
    if (!this.isTransportSupported(serverConfig.transport)) {
      result.errors.push(
        this.createValidationError(
          "transport",
          `Transport '${serverConfig.transport}' is not supported by VS Code`,
          ERROR_CODES.INVALID_TRANSPORT,
        ),
      );
      result.isValid = false;
    }

    return result;
  }

  getFormSections(existingConfig?: MCPServerConfig): ServerFormSection[] {
    const vscodeConfig = existingConfig as VSCodeMCPServerConfig;

    return [
      {
        title: "Basic Information",
        description: "Configure the basic server details",
        fields: [
          {
            id: "name",
            type: "text",
            label: "Server Name",
            placeholder: "context7",
            description: "Unique identifier for this MCP server",
            required: true,
            defaultValue: existingConfig?.name || "",
            validation: {
              pattern: VALIDATION_RULES.SERVER_NAME_PATTERN,
              maxLength: VALIDATION_RULES.MAX_LENGTHS.SERVER_NAME,
            },
          },
          {
            id: "description",
            type: "textarea",
            label: "Description",
            placeholder: "Up-to-date code docs for any prompt.",
            description: "Optional description of what this server does",
            defaultValue: existingConfig?.description || "",
            validation: {
              maxLength: VALIDATION_RULES.MAX_LENGTHS.DESCRIPTION,
            },
          },
          {
            id: "disabled",
            type: "checkbox",
            label: "Disabled",
            description: "Temporarily disable this server without removing it",
            defaultValue: existingConfig?.disabled || false,
          },
        ],
      },
      {
        title: "Transport Configuration",
        description: "Choose how VS Code will communicate with this server",
        fields: [
          {
            id: "transport",
            type: "select",
            label: "Transport Type",
            description: "Method used to communicate with the server",
            required: true,
            defaultValue: existingConfig?.transport || "http",
            options: [
              {
                label: "Standard I/O (stdio) - [Local Server]",
                value: "stdio",
              },
              {
                label: "Server-Sent Events (SSE) - [Remote Server]",
                value: "sse",
              },
              { label: "HTTP - [Remote Server]", value: "http" },
            ],
          },
        ],
      },
      {
        title: "VS Code-Specific Settings",
        description: "VS Code editor specific configuration options",
        fields: [
          {
            id: "envFile",
            type: "text",
            label: "Environment File",
            placeholder: ".env",
            description: "Path to environment file for loading variables",
            defaultValue: vscodeConfig?.envFile || "",
          },
          {
            id: "roots",
            type: "textarea",
            label: "Root Paths (JSON array)",
            placeholder: '[".", "src/"]',
            description: "JSON array of root paths for the server",
            defaultValue: vscodeConfig?.roots
              ? JSON.stringify(vscodeConfig.roots)
              : "",
          },
        ],
      },
      {
        title: "Input Definitions",
        description:
          "Define secure inputs that VS Code will prompt for at runtime",
        fields: [
          {
            id: "inputs",
            type: "textarea",
            label: "Inputs (JSON array)",
            placeholder:
              '[{"id": "api_key", "type": "promptString", "description": "API Key", "password": true}]',
            description: "JSON array of input definitions for secure prompting",
            defaultValue: "",
          },
        ],
      },
    ];
  }

  parseConfigData(
    rawData: unknown,
    configType: "workspace" | "user",
  ): MCPServerWithMetadata[] {
    if (!rawData || typeof rawData !== "object") {
      return [];
    }

    const servers: MCPServerWithMetadata[] = [];

    if (configType === "workspace") {
      const workspaceConfig = rawData as VSCodeWorkspaceConfig;
      if (workspaceConfig.servers) {
        for (const [serverName, serverConfig] of Object.entries(
          workspaceConfig.servers,
        )) {
          const rawConfig = serverConfig as unknown as Record<string, unknown>;
          let transport = rawConfig.transport as string;
          if (!transport) {
            if ("url" in rawConfig) {
              transport = "sse";
            } else if ("command" in rawConfig) {
              transport = "stdio";
            } else {
              transport = "stdio";
            }
          }

          const config = {
            ...serverConfig,
            name: serverName,
            transport: transport as TransportType,
            disabled: serverConfig.disabled ?? false,
          } as MCPServerConfig;

          servers.push({
            config,
            editor: "vscode",
            source: "workspace",
          });
        }
      }
    } else if (configType === "user") {
      const userSettings = rawData as VSCodeUserSettings;
      if (userSettings.mcp?.servers) {
        for (const [serverName, serverConfig] of Object.entries(
          userSettings.mcp.servers,
        )) {
          const rawConfig = serverConfig as unknown as Record<string, unknown>;
          let transport = rawConfig.transport as string;
          if (!transport) {
            if ("url" in rawConfig) {
              transport = "sse";
            } else if ("command" in rawConfig) {
              transport = "stdio";
            } else {
              transport = "stdio";
            }
          }

          const config = {
            ...serverConfig,
            name: serverName,
            transport: transport as TransportType,
            disabled: serverConfig.disabled ?? false,
          } as MCPServerConfig;

          servers.push({
            config,
            editor: "vscode",
            source: "user",
          });
        }
      }
    }

    return servers;
  }

  serializeConfigData(
    servers: MCPServerWithMetadata[],
    configType: "workspace" | "user",
  ): VSCodeWorkspaceConfig | VSCodeUserSettings {
    const vscodeServers = servers.filter(
      (server) => server.editor === "vscode",
    );

    if (configType === "workspace") {
      const config: VSCodeWorkspaceConfig = {
        servers: {},
      };

      for (const server of vscodeServers) {
        const { name, ...restConfig } = server.config;
        config.servers[name] = restConfig as VSCodeMCPServerConfig;
      }

      return config;
    } else {
      const mcpServers: Record<string, VSCodeMCPServerConfig> = {};

      for (const server of vscodeServers) {
        const { name, ...restConfig } = server.config;
        mcpServers[name] = restConfig as VSCodeMCPServerConfig;
      }

      const config: VSCodeUserSettings = {
        mcp: {
          servers: mcpServers,
        },
      };

      return config;
    }
  }

  getConfigPath(
    configType: "global" | "workspace" | "user" = "user",
  ): string | null {
    if (configType === "workspace") {
      return this.editorConfig.configPaths.workspace || null;
    } else if (configType === "user") {
      return this.editorConfig.configPaths.user || null;
    }
    return null;
  }

  supportsConfigType(configType: "global" | "workspace" | "user"): boolean {
    return configType === "workspace" || configType === "user";
  }

  isConfigTypeAvailable(configType: "global" | "workspace" | "user"): boolean {
    if (configType === "user") {
      return true;
    }

    if (configType === "workspace") {
      const workspacePath = this.getConfigPath("workspace");
      if (!workspacePath) return false;

      const vscodeDir = dirname(workspacePath);
      return this.isValidWorkspaceContext(vscodeDir);
    }

    return false;
  }

  getDefaultServerConfig(): Partial<VSCodeMCPServerConfig> {
    return {
      transport: "http",
      disabled: false,
    };
  }

  validateConfigStructure(
    configData: unknown,
    configType: "workspace" | "user",
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!configData || typeof configData !== "object") {
      errors.push(
        this.createValidationError(
          "structure",
          "Configuration must be an object",
          ERROR_CODES.SCHEMA_VALIDATION,
        ),
      );
      return { isValid: false, errors };
    }

    const data = configData as Record<string, unknown>;

    if (configType === "workspace") {
      if (!data.servers || typeof data.servers !== "object") {
        errors.push(
          this.createValidationError(
            "servers",
            "Workspace configuration must have a 'servers' object",
            ERROR_CODES.SCHEMA_VALIDATION,
          ),
        );
      }

      if (data.inputs && !Array.isArray(data.inputs)) {
        errors.push(
          this.createValidationError(
            "inputs",
            "Inputs must be an array",
            ERROR_CODES.SCHEMA_VALIDATION,
          ),
        );
      }
    } else if (configType === "user") {
      if (data.mcp && typeof data.mcp === "object") {
        const mcpData = data.mcp as { servers?: unknown; inputs?: unknown };

        if (mcpData.servers && typeof mcpData.servers !== "object") {
          errors.push(
            this.createValidationError(
              "mcp.servers",
              "User settings mcp.servers must be an object",
              ERROR_CODES.SCHEMA_VALIDATION,
            ),
          );
        }

        if (mcpData.inputs && !Array.isArray(mcpData.inputs)) {
          errors.push(
            this.createValidationError(
              "mcp.inputs",
              "User settings mcp.inputs must be an array",
              ERROR_CODES.SCHEMA_VALIDATION,
            ),
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async mergeWithExistingUserSettings(
    newMcpConfig: VSCodeUserSettings,
    existingSettingsPath: string,
  ): Promise<VSCodeUserSettings> {
    try {
      if (existsSync(existingSettingsPath)) {
        const existingContent = await readFile(existingSettingsPath, "utf-8");

        if (existingContent.trim()) {
          const { isValid, data } = validateJSONStructure(existingContent);

          if (isValid) {
            const existingSettings = data as VSCodeUserSettings;
            return {
              ...existingSettings,
              mcp: newMcpConfig.mcp,
            };
          }
        }
      }

      return newMcpConfig;
    } catch (error) {
      console.warn(
        "Could not read existing user settings, using new config only:",
        error,
      );
      return newMcpConfig;
    }
  }

  async writeConfig(
    servers: MCPServerWithMetadata[],
    configType: "global" | "workspace" | "user" = "user",
  ): Promise<void> {
    if (configType === "global") {
      configType = "user";
    }

    const configPath = this.getConfigPath(configType);
    if (!configPath) {
      throw new Error(
        `Could not determine VS Code config path for ${configType}`,
      );
    }

    try {
      const dir = dirname(configPath);
      await mkdir(dir, { recursive: true });
      const vscodeServers = servers.filter(
        (server) => server.editor === "vscode" && server.source === configType,
      );

      let configData = this.serializeConfigData(
        vscodeServers,
        configType as "workspace" | "user",
      );

      if (configType === "user") {
        configData = await this.mergeWithExistingUserSettings(
          configData as VSCodeUserSettings,
          configPath,
        );
      }

      await writeFile(configPath, JSON.stringify(configData, null, 2), "utf-8");
    } catch (error) {
      console.error(`Error writing VS Code ${configType} config:`, error);
      throw new Error(
        `Failed to write VS Code ${configType} configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public isValidWorkspaceContext(vscodeDir: string): boolean {
    const normalizedPath = vscodeDir.toLowerCase();

    if (
      normalizedPath.includes("/system/") ||
      normalizedPath.includes("/usr/") ||
      normalizedPath.includes("/bin/") ||
      normalizedPath.includes("/etc/") ||
      normalizedPath === "/.vscode" ||
      normalizedPath === process.env.HOME + "/.vscode" ||
      vscodeDir === ".vscode"
    ) {
      return false;
    }

    if (existsSync(vscodeDir)) {
      return true;
    }
    const parentDir = dirname(vscodeDir);
    const projectIndicators = [
      "package.json",
      "pyproject.toml",
      "Cargo.toml",
      "go.mod",
      ".git",
      "README.md",
      "pom.xml",
      "build.gradle",
      "composer.json",
    ];

    return projectIndicators.some((indicator) =>
      existsSync(`${parentDir}/${indicator}`),
    );
  }

  async readInputs(
    configType: "workspace" | "user" = "user",
  ): Promise<VSCodeInput[]> {
    const configPath = this.getConfigPath(configType);
    if (!configPath) {
      throw new Error(
        `Could not determine VS Code config path for ${configType}`,
      );
    }

    try {
      if (!existsSync(configPath)) {
        if (configType === "workspace") {
          const dir = dirname(configPath);
          const isValidWorkspace = this.isValidWorkspaceContext(dir);

          if (isValidWorkspace) {
            console.log(
              `VS Code workspace config file not found at ${configPath}, creating empty configuration for inputs`,
            );

            try {
              await mkdir(dir, { recursive: true });
              const emptyConfig = { servers: {} };
              await writeFile(
                configPath,
                JSON.stringify(emptyConfig, null, 2),
                "utf-8",
              );
            } catch (error) {
              console.warn(
                `Could not create VS Code workspace config at ${configPath}:`,
                error,
              );
            }
          } else {
            logOnce(
              `VS Code workspace config not found at ${configPath}, not creating for inputs (not in valid workspace context)`,
            );
          }
        } else {
          console.log(
            `VS Code user settings file not found at ${configPath}, returning empty inputs (not creating user settings)`,
          );
        }

        return [];
      }

      const fileContent = await readFile(configPath, "utf-8");

      if (!fileContent.trim()) {
        console.log(
          `VS Code config file is empty at ${configPath}, returning empty inputs`,
        );
        return [];
      }

      const { isValid, data, error } = validateJSONStructure(fileContent);

      if (!isValid) {
        throw new Error(`Invalid JSON in VS Code config file: ${error}`);
      }

      if (configType === "workspace") {
        const workspaceConfig = data as VSCodeWorkspaceConfig;
        return workspaceConfig.inputs || [];
      } else {
        const userSettings = data as VSCodeUserSettings;
        return userSettings.mcp?.inputs || [];
      }
    } catch (error) {
      console.error(`Error reading VS Code ${configType} inputs:`, error);
      throw new Error(
        `Failed to read VS Code ${configType} inputs: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async writeInputs(
    inputs: VSCodeInput[],
    configType: "workspace" | "user" = "user",
  ): Promise<void> {
    const configPath = this.getConfigPath(configType);
    if (!configPath) {
      throw new Error(
        `Could not determine VS Code config path for ${configType}`,
      );
    }

    try {
      const dir = dirname(configPath);
      await mkdir(dir, { recursive: true });

      let configData: VSCodeWorkspaceConfig | VSCodeUserSettings;

      if (configType === "workspace") {
        let existingConfig: VSCodeWorkspaceConfig = { servers: {} };

        if (existsSync(configPath)) {
          const fileContent = await readFile(configPath, "utf-8");
          if (fileContent.trim()) {
            const { isValid, data } = validateJSONStructure(fileContent);
            if (isValid) {
              existingConfig = data as VSCodeWorkspaceConfig;
            }
          }
        }

        configData = {
          ...existingConfig,
          inputs: inputs.length > 0 ? inputs : undefined,
        };
      } else {
        let existingSettings: VSCodeUserSettings = {};

        if (existsSync(configPath)) {
          const fileContent = await readFile(configPath, "utf-8");
          if (fileContent.trim()) {
            const { isValid, data } = validateJSONStructure(fileContent);
            if (isValid) {
              existingSettings = data as VSCodeUserSettings;
            }
          }
        }

        configData = {
          ...existingSettings,
          mcp: {
            ...existingSettings.mcp,
            inputs: inputs.length > 0 ? inputs : undefined,
          },
        };
      }

      await writeFile(configPath, JSON.stringify(configData, null, 2), "utf-8");
    } catch (error) {
      console.error(`Error writing VS Code ${configType} inputs:`, error);
      throw new Error(
        `Failed to write VS Code ${configType} inputs: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
