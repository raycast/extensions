import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { BaseEditorService, ServerFormField, ServerFormSection } from "./BaseEditorService";
import {
  MCPServerConfig,
  MCPServerWithMetadata,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CursorMCPServerConfig,
  CursorConfigFile,
} from "../types/mcpServer";
import { EDITOR_CONFIGS, ERROR_CODES, VALIDATION_RULES } from "../utils/constants";
import { validateMCPServerConfig, validateJSONStructure } from "../utils/validation";
import { existsSync } from "fs";

export class CursorEditorService extends BaseEditorService {
  constructor() {
    super(EDITOR_CONFIGS.cursor);
  }

  async readConfig(configType: "global" | "workspace" | "user" = "global"): Promise<MCPServerWithMetadata[]> {
    if (configType !== "global") {
      throw new Error(`Cursor only supports global configuration. Received: ${configType}`);
    }

    const configPath = this.getConfigPath(configType);
    if (!configPath) {
      throw new Error("Could not determine Cursor config path");
    }

    try {
      if (!existsSync(configPath)) {
        console.log(`Cursor config file not found at ${configPath}, creating empty configuration`);

        const dir = dirname(configPath);
        await mkdir(dir, { recursive: true });

        const emptyConfig = { mcpServers: {} };
        await writeFile(configPath, JSON.stringify(emptyConfig, null, 2), "utf-8");

        return [];
      }

      const fileContent = await readFile(configPath, "utf-8");

      if (!fileContent.trim()) {
        console.log(`Cursor config file is empty at ${configPath}, returning empty configuration`);
        return [];
      }

      const { isValid, data, error } = validateJSONStructure(fileContent);

      if (!isValid) {
        throw new Error(`Invalid JSON in Cursor config file: ${error}`);
      }

      return this.parseConfigData(data, configType);
    } catch (error) {
      console.error("Error reading Cursor config:", error);
      throw new Error(
        `Failed to read Cursor configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async writeConfig(
    servers: MCPServerWithMetadata[],
    configType: "global" | "workspace" | "user" = "global",
  ): Promise<void> {
    if (configType !== "global") {
      throw new Error(`Cursor only supports global configuration. Received: ${configType}`);
    }

    const configPath = this.getConfigPath(configType);
    if (!configPath) {
      throw new Error("Could not determine Cursor config path");
    }

    try {
      const dir = dirname(configPath);
      await mkdir(dir, { recursive: true });

      const cursorServers = servers.filter((server) => server.editor === "cursor");

      const configData = this.serializeConfigData(cursorServers, configType);

      await writeFile(configPath, JSON.stringify(configData, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing Cursor config:", error);
      throw new Error(
        `Failed to write Cursor configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  validateServerConfig(serverConfig: MCPServerConfig): ValidationResult {
    const result = validateMCPServerConfig(serverConfig, "cursor");

    if (!this.isTransportSupported(serverConfig.transport)) {
      result.errors.push(
        this.createValidationError(
          "transport",
          `Transport '${serverConfig.transport}' is not supported by Cursor`,
          ERROR_CODES.INVALID_TRANSPORT,
        ),
      );
      result.isValid = false;
    }

    return result;
  }

  getFormSections(existingConfig?: MCPServerConfig): ServerFormSection[] {
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
        ],
      },
      {
        title: "Note",
        description:
          "Server enable/disable is managed through Cursor's MCP settings UI, not through configuration files",
        fields: [],
      },
      {
        title: "Transport Configuration",
        description: "Choose how Cursor will communicate with this server",
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
              { label: "Server-Sent Events (SSE) - [Remote Server]", value: "sse" },
            ],
          },
        ],
      },
    ];
  }

  parseConfigData(rawData: unknown, configType: "global" | "workspace" | "user" = "global"): MCPServerWithMetadata[] {
    const servers: MCPServerWithMetadata[] = [];

    if (!rawData || typeof rawData !== "object") {
      return servers;
    }

    const mcpServers = (rawData as { mcpServers?: Record<string, unknown> }).mcpServers || {};

    Object.entries(mcpServers).forEach(([serverName, serverConfig]: [string, unknown]) => {
      try {
        const rawConfig = serverConfig as Record<string, unknown>;

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
          name: serverName,
          transport,
          ...rawConfig,
        } as CursorMCPServerConfig;

        servers.push({
          config,
          editor: "cursor",
          source: configType,
        });
      } catch (error) {
        console.warn(`Failed to parse Cursor server '${serverName}':`, error);
      }
    });

    return servers;
  }

  serializeConfigData(
    servers: MCPServerWithMetadata[],
    _configType: "global" | "workspace" | "user" = "global",
  ): CursorConfigFile {
    void _configType;
    const mcpServers: Record<string, CursorMCPServerConfig> = {};

    servers.forEach(({ config }) => {
      if (config.name) {
        const { name, disabled, ...serverConfig } = config as CursorMCPServerConfig & { disabled?: boolean };
        void disabled;
        mcpServers[name] = serverConfig as CursorMCPServerConfig;
      }
    });

    return { mcpServers };
  }

  getConfigPath(configType: "global" | "workspace" | "user" = "global"): string | null {
    if (configType === "global") {
      return this.editorConfig.configPaths.global || null;
    }
    return null;
  }

  supportsConfigType(configType: "global" | "workspace" | "user"): boolean {
    return configType === "global";
  }

  isConfigTypeAvailable(configType: "global" | "workspace" | "user"): boolean {
    return configType === "global";
  }

  getDefaultServerConfig(): Partial<CursorMCPServerConfig> {
    return {
      transport: "stdio",
    };
  }

  validateConfigStructure(
    configData: unknown,
    _configType: "global" | "workspace" | "user" = "global",
  ): ValidationResult {
    void _configType;
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!configData || typeof configData !== "object") {
      errors.push(
        this.createValidationError("root", "Configuration must be a valid JSON object", ERROR_CODES.INVALID_JSON),
      );
      return { isValid: false, errors, warnings };
    }

    const typedConfigData = configData as { mcpServers?: unknown };

    if (!typedConfigData.mcpServers) {
      errors.push(
        this.createValidationError(
          "mcpServers",
          "Missing 'mcpServers' property in configuration",
          ERROR_CODES.SCHEMA_VALIDATION,
        ),
      );
      return { isValid: false, errors, warnings };
    }

    if (typeof typedConfigData.mcpServers !== "object") {
      errors.push(
        this.createValidationError("mcpServers", "'mcpServers' must be an object", ERROR_CODES.SCHEMA_VALIDATION),
      );
      return { isValid: false, errors, warnings };
    }

    Object.entries(typedConfigData.mcpServers as Record<string, unknown>).forEach(
      ([serverName, serverConfig]: [string, unknown]) => {
        if (!serverConfig || typeof serverConfig !== "object") {
          errors.push(
            this.createValidationError(
              `mcpServers.${serverName}`,
              "Server configuration must be an object",
              ERROR_CODES.SCHEMA_VALIDATION,
            ),
          );
          return;
        }

        const rawConfig = serverConfig as Record<string, unknown>;

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
          name: serverName,
          transport,
          ...rawConfig,
        } as CursorMCPServerConfig;
        const serverValidation = this.validateServerConfig(config);

        serverValidation.errors.forEach((error) => {
          errors.push({
            ...error,
            field: `mcpServers.${serverName}.${error.field}`,
          });
        });

        if (serverValidation.warnings) {
          serverValidation.warnings.forEach((warning) => {
            warnings.push({
              ...warning,
              field: `mcpServers.${serverName}.${warning.field}`,
            });
          });
        }
      },
    );

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getTransportFormFields(transport: string, existingConfig?: MCPServerConfig): ServerFormField[] {
    switch (transport) {
      case "stdio":
        return [
          {
            id: "command",
            type: "text",
            label: "Command",
            placeholder: "python -m my_mcp_server",
            description: "The command to execute to start the server",
            required: true,
            defaultValue: existingConfig && "command" in existingConfig ? existingConfig.command : "",
            validation: {
              maxLength: VALIDATION_RULES.MAX_LENGTHS.COMMAND,
            },
          },
          {
            id: "args",
            type: "textarea",
            label: "Arguments",
            placeholder: "Enter arguments, one per line",
            description: "Command line arguments (one per line)",
            defaultValue:
              existingConfig && "args" in existingConfig && existingConfig.args ? existingConfig.args.join("\n") : "",
          },
        ];

      case "sse":
        return [
          {
            id: "url",
            type: "text",
            label: "Server URL",
            placeholder: "https://mcp.context7.com/mcp",
            description: "The remote endpoint URL for the server",
            required: true,
            defaultValue: existingConfig && "url" in existingConfig ? existingConfig.url : "",
            validation: {
              pattern: VALIDATION_RULES.URL_PATTERNS.SSE,
              maxLength: VALIDATION_RULES.MAX_LENGTHS.URL,
            },
          },
        ];

      default:
        return [];
    }
  }
}
