import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { BaseEditorService, ServerFormSection } from "./BaseEditorService";
import {
  MCPServerConfig,
  MCPServerWithMetadata,
  ValidationResult,
  ValidationError,
  WindsurfMCPServerConfig,
  WindsurfConfigFile,
  TransportType,
} from "../types/mcpServer";
import { EDITOR_CONFIGS, DEFAULT_SERVER_VALUES, ERROR_CODES, VALIDATION_RULES } from "../utils/constants";
import { validateMCPServerConfig, validateJSONStructure } from "../utils/validation";
import { existsSync } from "fs";

export class WindsurfEditorService extends BaseEditorService {
  constructor() {
    super(EDITOR_CONFIGS.windsurf);
  }

  async readConfig(configType: "global" | "workspace" | "user" = "global"): Promise<MCPServerWithMetadata[]> {
    if (configType !== "global") {
      throw new Error(`Windsurf only supports global configuration. Received: ${configType}`);
    }

    const configPath = this.getConfigPath(configType);
    if (!configPath) {
      throw new Error("Could not determine Windsurf config path");
    }

    try {
      if (!existsSync(configPath)) {
        console.log(`Windsurf config file not found at ${configPath}, creating empty configuration`);

        const dir = dirname(configPath);
        await mkdir(dir, { recursive: true });

        const emptyConfig = { mcpServers: {} };
        await writeFile(configPath, JSON.stringify(emptyConfig, null, 2), "utf-8");

        return [];
      }

      const fileContent = await readFile(configPath, "utf-8");

      if (!fileContent.trim()) {
        console.log(`Windsurf config file is empty at ${configPath}, returning empty configuration`);
        return [];
      }

      const { isValid, data, error } = validateJSONStructure(fileContent);

      if (!isValid) {
        throw new Error(`Invalid JSON in Windsurf config file: ${error}`);
      }

      return this.parseConfigData(data, configType);
    } catch (error) {
      console.error("Error reading Windsurf config:", error);
      throw new Error(
        `Failed to read Windsurf configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async writeConfig(
    servers: MCPServerWithMetadata[],
    configType: "global" | "workspace" | "user" = "global",
  ): Promise<void> {
    if (configType !== "global") {
      throw new Error(`Windsurf only supports global configuration. Received: ${configType}`);
    }

    const configPath = this.getConfigPath(configType);
    if (!configPath) {
      throw new Error("Could not determine Windsurf config path");
    }

    try {
      const dir = dirname(configPath);
      await mkdir(dir, { recursive: true });

      const windsurfServers = servers.filter((server) => server.editor === "windsurf");

      const configData = this.serializeConfigData(windsurfServers, configType);

      await writeFile(configPath, JSON.stringify(configData, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing Windsurf config:", error);
      throw new Error(
        `Failed to write Windsurf configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  validateServerConfig(serverConfig: MCPServerConfig): ValidationResult {
    const result = validateMCPServerConfig(serverConfig, "windsurf");

    if (!this.isTransportSupported(serverConfig.transport)) {
      result.errors.push(
        this.createValidationError(
          "transport",
          `Transport '${serverConfig.transport}' is not supported by Windsurf`,
          ERROR_CODES.INVALID_TRANSPORT,
        ),
      );
      result.isValid = false;
    }

    return result;
  }

  getFormSections(existingConfig?: MCPServerConfig): ServerFormSection[] {
    const sections: ServerFormSection[] = [
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
        ],
      },
      {
        title: "Transport Configuration",
        description: "Choose how Windsurf will communicate with this server",
        fields: [
          {
            id: "transport",
            type: "select",
            label: "Transport Type",
            description: "Method used to communicate with the server",
            required: true,
            defaultValue: existingConfig?.transport || "stdio",
            options: [
              { label: "Standard I/O (stdio) - [Local Server]", value: "stdio" },
              { label: "Server-Sent Events (/sse) - [Remote Server]", value: "/sse" },
            ],
          },
        ],
      },
    ];

    const transport = existingConfig?.transport || "stdio";

    if (transport === "stdio") {
      sections.push({
        title: "Standard I/O Configuration",
        description: "Configure command and arguments for stdio transport",
        fields: [
          {
            id: "command",
            type: "text",
            label: "Command",
            placeholder: "npx -y @modelcontextprotocol/server-filesystem",
            description: "Command to execute the MCP server",
            required: true,
            defaultValue: "command" in (existingConfig || {}) ? (existingConfig as { command?: string })?.command : "",
            validation: {
              maxLength: VALIDATION_RULES.MAX_LENGTHS.COMMAND,
            },
          },
          {
            id: "args",
            type: "textarea",
            label: "Arguments",
            placeholder: "/path/to/directory\n--verbose",
            description: "Command line arguments (one per line)",
            defaultValue:
              "args" in (existingConfig || {}) ? (existingConfig as { args?: string[] })?.args?.join("\n") : "",
          },
          {
            id: "env",
            type: "textarea",
            label: "Environment Variables",
            placeholder: "API_KEY=your-api-key\nDEBUG=true",
            description: "Environment variables in KEY=value format (one per line)",
            defaultValue:
              "env" in (existingConfig || {})
                ? Object.entries((existingConfig as { env?: Record<string, string> })?.env || {})
                    .map(([k, v]) => `${k}=${v}`)
                    .join("\n")
                : "",
          },
        ],
      });
    } else if (transport === "/sse") {
      sections.push({
        title: "Server-Sent Events Configuration",
        description: "Configure SSE connection for Windsurf",
        fields: [
          {
            id: "serverUrl",
            type: "text",
            label: "Server URL",
            placeholder: "https://mcp.context7.com/sse",
            description: "URL for the SSE MCP server",
            required: true,
            defaultValue:
              "serverUrl" in (existingConfig || {}) ? (existingConfig as { serverUrl?: string })?.serverUrl : "",
            validation: {
              maxLength: VALIDATION_RULES.MAX_LENGTHS.URL,
            },
          },
        ],
      });
    }

    return sections;
  }

  parseConfigData(rawData: unknown, _configType: "global" | "workspace" | "user" = "global"): MCPServerWithMetadata[] {
    void _configType;
    if (!rawData || typeof rawData !== "object") {
      return [];
    }

    const servers: MCPServerWithMetadata[] = [];

    const typedRawData = rawData as Record<string, unknown>;
    let serverData = rawData;
    if (typedRawData.mcpServers && typeof typedRawData.mcpServers === "object") {
      serverData = typedRawData.mcpServers;
    }

    for (const [serverName, serverConfig] of Object.entries(serverData)) {
      if (typeof serverConfig === "object" && serverConfig !== null) {
        const rawConfig = serverConfig as Record<string, unknown>;
        let transport = rawConfig.transport as string;
        if (!transport) {
          if ("serverUrl" in rawConfig) {
            transport = "/sse";
          } else if ("command" in rawConfig) {
            transport = "stdio";
          } else {
            transport = "stdio";
          }
        }

        const config = {
          ...rawConfig,
          name: serverName,
          transport: transport as TransportType,
          disabled: (rawConfig.disabled as boolean) ?? false,
        } as WindsurfMCPServerConfig;

        servers.push({
          config,
          editor: "windsurf",
          source: "global",
        });
      }
    }

    return servers;
  }

  serializeConfigData(
    servers: MCPServerWithMetadata[],
    _configType: "global" | "workspace" | "user" = "global",
  ): WindsurfConfigFile {
    void _configType;
    const mcpServers: Record<string, WindsurfMCPServerConfig> = {};

    for (const server of servers) {
      if (server.editor === "windsurf") {
        const config = server.config;
        const { name } = config;

        let windsurfConfig: WindsurfMCPServerConfig;

        if (config.transport === "stdio") {
          const stdioConfig = config as { command?: string; args?: string[]; env?: Record<string, string> };
          windsurfConfig = {
            name: config.name,
            transport: "stdio",
            command: stdioConfig.command || "",
            ...(stdioConfig.args && { args: stdioConfig.args }),
            ...(stdioConfig.env && { env: stdioConfig.env }),
            ...(config.description && { description: config.description }),
            ...(config.disabled && { disabled: config.disabled }),
          };
        } else if (config.transport === "/sse") {
          const sseConfig = config as { serverUrl?: string };
          windsurfConfig = {
            name: config.name,
            transport: "/sse",
            serverUrl: sseConfig.serverUrl || "",
            ...(config.description && { description: config.description }),
            ...(config.disabled && { disabled: config.disabled }),
          };
        } else {
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { name: _, ...configWithoutName } = windsurfConfig;
        mcpServers[name] = configWithoutName as WindsurfMCPServerConfig;
      }
    }

    return { mcpServers } as WindsurfConfigFile;
  }

  getConfigPath(configType: "global" | "workspace" | "user" = "global"): string | null {
    if (configType !== "global") {
      return null;
    }

    return this.editorConfig.configPaths.global || null;
  }

  supportsConfigType(configType: "global" | "workspace" | "user"): boolean {
    return configType === "global";
  }

  isConfigTypeAvailable(configType: "global" | "workspace" | "user"): boolean {
    return configType === "global";
  }

  getDefaultServerConfig(): Partial<WindsurfMCPServerConfig> {
    return {
      ...DEFAULT_SERVER_VALUES.windsurf,
      transport: "stdio",
      disabled: false,
    };
  }

  validateConfigStructure(
    configData: unknown,
    _configType: "global" | "workspace" | "user" = "global",
  ): ValidationResult {
    void _configType;
    const errors: ValidationError[] = [];

    if (!configData || typeof configData !== "object") {
      errors.push(
        this.createValidationError("structure", "Configuration must be an object", ERROR_CODES.SCHEMA_VALIDATION),
      );
      return { isValid: false, errors };
    }

    for (const [serverName, serverConfig] of Object.entries(configData)) {
      if (typeof serverConfig !== "object" || serverConfig === null) {
        errors.push(
          this.createValidationError(
            `${serverName}`,
            "Server configuration must be an object",
            ERROR_CODES.SCHEMA_VALIDATION,
          ),
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
