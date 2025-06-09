import {
  MCPServerConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  EditorType,
  EnvironmentVariable,
  VSCodeInput,
  VSCodeInputReference,
  VSCodeInputValidationResult,
  MCPServerWithMetadata,
} from "../types/mcpServer";
import { VALIDATION_RULES, ERROR_CODES } from "./constants";

export function validateMCPServerConfig(config: MCPServerConfig, editorType: EditorType): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!config.name || config.name.trim() === "") {
    errors.push(createError("name", "Server name is required", ERROR_CODES.REQUIRED_FIELD));
  }

  if (!config.transport) {
    errors.push(createError("transport", "Transport type is required", ERROR_CODES.REQUIRED_FIELD));
  }

  if (config.name && !VALIDATION_RULES.SERVER_NAME_PATTERN.test(config.name)) {
    errors.push(
      createError(
        "name",
        "Server name can only contain letters, numbers, hyphens, and underscores",
        ERROR_CODES.INVALID_FORMAT,
      ),
    );
  }

  if (config.name && config.name.length > VALIDATION_RULES.MAX_LENGTHS.SERVER_NAME) {
    errors.push(
      createError(
        "name",
        `Server name cannot exceed ${VALIDATION_RULES.MAX_LENGTHS.SERVER_NAME} characters`,
        ERROR_CODES.EXCEEDS_MAX_LENGTH,
      ),
    );
  }

  if (config.description && config.description.length > VALIDATION_RULES.MAX_LENGTHS.DESCRIPTION) {
    errors.push(
      createError(
        "description",
        `Description cannot exceed ${VALIDATION_RULES.MAX_LENGTHS.DESCRIPTION} characters`,
        ERROR_CODES.EXCEEDS_MAX_LENGTH,
      ),
    );
  }

  const transportErrors = validateTransportConfig(config, editorType);
  errors.push(...transportErrors);

  if ("env" in config && config.env) {
    const envErrors = validateEnvironmentVariables(config.env);
    errors.push(...envErrors);
  }

  const editorErrors = validateEditorSpecificConfig(config, editorType);
  errors.push(...editorErrors);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateTransportConfig(config: MCPServerConfig, editorType: EditorType): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (config.transport) {
    case "stdio":
      errors.push(...validateStdioConfig(config));
      break;
    case "sse":
    case "/sse":
      errors.push(...validateSSEConfig(config, editorType));
      break;
    case "http":
      errors.push(...validateHTTPConfig(config, editorType));
      break;
    default:
      errors.push(createError("transport", "Invalid transport type", ERROR_CODES.INVALID_TRANSPORT));
  }

  return errors;
}

function validateStdioConfig(config: MCPServerConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if ("command" in config) {
    if (!config.command || config.command.trim() === "") {
      errors.push(createError("command", "Command is required for stdio transport", ERROR_CODES.REQUIRED_FIELD));
    }

    if (config.command && config.command.length > VALIDATION_RULES.MAX_LENGTHS.COMMAND) {
      errors.push(
        createError(
          "command",
          `Command cannot exceed ${VALIDATION_RULES.MAX_LENGTHS.COMMAND} characters`,
          ERROR_CODES.EXCEEDS_MAX_LENGTH,
        ),
      );
    }

    if (config.command && (!("args" in config) || !config.args || config.args.length === 0)) {
      const command = config.command.toLowerCase().trim();

      const commandsNeedingArgs = ["npx", "node", "python", "python3", "pip", "npm", "docker"];

      if (commandsNeedingArgs.some((cmd) => command === cmd || command.endsWith(cmd))) {
        errors.push(
          createError(
            "args",
            `Command '${config.command}' typically requires arguments for MCP servers (e.g., script file, package name)`,
            ERROR_CODES.INVALID_FORMAT,
          ),
        );
      }
    }
  } else {
    errors.push(createError("command", "Command is required for stdio transport", ERROR_CODES.REQUIRED_FIELD));
  }

  return errors;
}

function validateSSEConfig(config: MCPServerConfig, editorType?: EditorType): ValidationError[] {
  const errors: ValidationError[] = [];

  if (editorType === "windsurf" && config.transport === "/sse") {
    if ("serverUrl" in config) {
      if (!config.serverUrl || config.serverUrl.trim() === "") {
        errors.push(
          createError("serverUrl", "Server URL is required for Windsurf SSE transport", ERROR_CODES.REQUIRED_FIELD),
        );
      }

      if (config.serverUrl && !VALIDATION_RULES.URL_PATTERNS.SSE.test(config.serverUrl)) {
        errors.push(createError("serverUrl", "Invalid server URL format for SSE transport", ERROR_CODES.INVALID_URL));
      }

      if (config.serverUrl && config.serverUrl.length > VALIDATION_RULES.MAX_LENGTHS.URL) {
        errors.push(
          createError(
            "serverUrl",
            `Server URL cannot exceed ${VALIDATION_RULES.MAX_LENGTHS.URL} characters`,
            ERROR_CODES.EXCEEDS_MAX_LENGTH,
          ),
        );
      }
    } else {
      errors.push(
        createError("serverUrl", "Server URL is required for Windsurf SSE transport", ERROR_CODES.REQUIRED_FIELD),
      );
    }
  } else {
    if ("url" in config) {
      if (!config.url || config.url.trim() === "") {
        errors.push(createError("url", "URL is required for SSE transport", ERROR_CODES.REQUIRED_FIELD));
      }

      if (config.url && !VALIDATION_RULES.URL_PATTERNS.SSE.test(config.url)) {
        errors.push(createError("url", "Invalid URL format for SSE transport", ERROR_CODES.INVALID_URL));
      }

      if (config.url && config.url.length > VALIDATION_RULES.MAX_LENGTHS.URL) {
        errors.push(
          createError(
            "url",
            `URL cannot exceed ${VALIDATION_RULES.MAX_LENGTHS.URL} characters`,
            ERROR_CODES.EXCEEDS_MAX_LENGTH,
          ),
        );
      }
    } else {
      errors.push(createError("url", "URL is required for SSE transport", ERROR_CODES.REQUIRED_FIELD));
    }
  }

  return errors;
}

function validateHTTPConfig(config: MCPServerConfig, editorType: EditorType): ValidationError[] {
  const errors: ValidationError[] = [];

  if (editorType !== "vscode") {
    errors.push(
      createError("transport", `HTTP transport is not supported by ${editorType}`, ERROR_CODES.INVALID_TRANSPORT),
    );
    return errors;
  }

  if ("url" in config) {
    if (!config.url || config.url.trim() === "") {
      errors.push(createError("url", "URL is required for HTTP transport", ERROR_CODES.REQUIRED_FIELD));
    }

    if (config.url && !VALIDATION_RULES.URL_PATTERNS.HTTP.test(config.url)) {
      errors.push(createError("url", "Invalid URL format for HTTP transport", ERROR_CODES.INVALID_URL));
    }

    if (config.url && config.url.length > VALIDATION_RULES.MAX_LENGTHS.URL) {
      errors.push(
        createError(
          "url",
          `URL cannot exceed ${VALIDATION_RULES.MAX_LENGTHS.URL} characters`,
          ERROR_CODES.EXCEEDS_MAX_LENGTH,
        ),
      );
    }
  } else {
    errors.push(createError("url", "URL is required for HTTP transport", ERROR_CODES.REQUIRED_FIELD));
  }

  return errors;
}

export function validateEnvironmentVariables(env: EnvironmentVariable): ValidationError[] {
  const errors: ValidationError[] = [];

  Object.entries(env).forEach(([key, value]) => {
    if (!VALIDATION_RULES.ENV_VAR_KEY_PATTERN.test(key)) {
      errors.push(
        createError(
          `env.${key}`,
          "Environment variable keys must contain only uppercase letters, numbers, and underscores",
          ERROR_CODES.INVALID_ENV_VAR,
        ),
      );
    }

    if (value && value.length > VALIDATION_RULES.MAX_LENGTHS.ENV_VAR_VALUE) {
      errors.push(
        createError(
          `env.${key}`,
          `Environment variable value cannot exceed ${VALIDATION_RULES.MAX_LENGTHS.ENV_VAR_VALUE} characters`,
          ERROR_CODES.EXCEEDS_MAX_LENGTH,
        ),
      );
    }
  });

  return errors;
}
function validateEditorSpecificConfig(config: MCPServerConfig, editorType: EditorType): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (editorType) {
    case "cursor":
      break;

    case "windsurf":
      if ("maxTools" in config && config.maxTools !== undefined && config.maxTools !== null) {
        const maxTools = typeof config.maxTools === "number" ? config.maxTools : Number(config.maxTools);

        if (isNaN(maxTools)) {
          errors.push(createError("maxTools", "Maximum tools must be a valid number", ERROR_CODES.INVALID_FORMAT));
        } else {
          if (maxTools > VALIDATION_RULES.WINDSURF_MAX_TOOLS) {
            errors.push(
              createError(
                "maxTools",
                `Maximum tools cannot exceed ${VALIDATION_RULES.WINDSURF_MAX_TOOLS} for Windsurf`,
                ERROR_CODES.EXCEEDS_MAX_TOOLS,
              ),
            );
          }
          if (maxTools < 1) {
            errors.push(createError("maxTools", "Maximum tools must be at least 1", ERROR_CODES.INVALID_FORMAT));
          }
        }
      }
      break;

    case "vscode":
      break;
  }

  return errors;
}

export function validateVSCodeInputs(inputs: VSCodeInput[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  inputs.forEach((input, index) => {
    const prefix = `inputs[${index}]`;

    if (!input.id || input.id.trim() === "") {
      errors.push(createError(`${prefix}.id`, "Input ID is required", ERROR_CODES.REQUIRED_FIELD));
    }

    if (!input.description || input.description.trim() === "") {
      errors.push(createError(`${prefix}.description`, "Input description is required", ERROR_CODES.REQUIRED_FIELD));
    }

    if (input.id && seenIds.has(input.id)) {
      errors.push(createError(`${prefix}.id`, `Duplicate input ID: ${input.id}`, ERROR_CODES.DUPLICATE_SERVER_NAME));
    } else if (input.id) {
      seenIds.add(input.id);
    }

    if (input.id && !VALIDATION_RULES.SERVER_NAME_PATTERN.test(input.id)) {
      errors.push(
        createError(
          `${prefix}.id`,
          "Input ID can only contain letters, numbers, hyphens, and underscores",
          ERROR_CODES.INVALID_FORMAT,
        ),
      );
    }

    if (input.type && input.type !== "promptString") {
      errors.push(createError(`${prefix}.type`, "Input type must be 'promptString'", ERROR_CODES.INVALID_FORMAT));
    }
  });

  return errors;
}

export function validateJSONStructure(jsonString: string): { isValid: boolean; data?: unknown; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    return { isValid: true, data };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid JSON format",
    };
  }
}

export function validateServerNameUniqueness(
  servers: { config: { name: string } }[],
  newServerName: string,
  excludeIndex?: number,
): boolean {
  return !servers.some((server, index) => {
    if (excludeIndex !== undefined && index === excludeIndex) {
      return false;
    }
    return server.config.name === newServerName;
  });
}

function createError(field: string, message: string, code: string): ValidationError {
  return { field, message, code };
}

export function sanitizeServerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractVSCodeInputReferences(
  serverConfig: MCPServerConfig,
  serverName: string,
): VSCodeInputReference[] {
  const references: VSCodeInputReference[] = [];

  function scanValue(value: string, fieldPath: string): void {
    const matches = value.match(VALIDATION_RULES.VSCODE_VARIABLE_PATTERNS.INPUT_VAR);
    if (matches) {
      matches.forEach((match) => {
        const inputId = match.replace(/\$\{input:([^}]+)\}/, "$1");
        references.push({
          inputId,
          serverName,
          field: fieldPath,
          variablePattern: match,
        });
      });
    }
  }

  function scanObject(obj: unknown, prefix: string = ""): void {
    if (typeof obj === "string") {
      scanValue(obj, prefix);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === "string") {
          scanValue(item, `${prefix}[${index}]`);
        } else if (typeof item === "object" && item !== null) {
          scanObject(item, `${prefix}[${index}]`);
        }
      });
    } else if (typeof obj === "object" && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        scanObject(value, fullPath);
      });
    }
  }

  scanObject(serverConfig);

  return references;
}

export function validateVSCodeInputReferences(
  servers: MCPServerWithMetadata[],
  definedInputs: VSCodeInput[],
): VSCodeInputValidationResult {
  const errors: ValidationError[] = [];
  const definedInputIds = new Set(definedInputs.map((input) => input.id));
  const referencedInputIds = new Set<string>();

  const vscodeServers = servers.filter((server) => server.editor === "vscode");

  vscodeServers.forEach((server) => {
    const references = extractVSCodeInputReferences(server.config, server.config.name);

    references.forEach((ref) => {
      referencedInputIds.add(ref.inputId);

      if (!definedInputIds.has(ref.inputId)) {
        errors.push(
          createError(
            `${ref.serverName}.${ref.field}`,
            `Referenced input '${ref.inputId}' is not defined in workspace/user inputs`,
            ERROR_CODES.INVALID_INPUT_REFERENCE,
          ),
        );
      }
    });
  });

  const unreferencedInputs = definedInputs
    .filter((input) => !referencedInputIds.has(input.id))
    .map((input) => input.id);
  const missingInputs = Array.from(referencedInputIds).filter((id) => !definedInputIds.has(id));

  return {
    isValid: errors.length === 0,
    errors,
    unreferencedInputs,
    missingInputs,
  };
}
