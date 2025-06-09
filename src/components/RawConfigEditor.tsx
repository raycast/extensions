import { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  useNavigation,
  Color,
} from "@raycast/api";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, basename } from "path";
import { existsSync } from "fs";
import { EditorType } from "../types/mcpServer";
import { EditorManager } from "../services/EditorManager";
import { getEditorConfig } from "../utils/constants";
import {
  validateJSONStructure,
  validateMCPServerConfig,
} from "../utils/validation";

interface RawConfigEditorProps {
  editorType: EditorType;
  configType?: "global" | "workspace" | "user";
}

interface ValidationState {
  isValid: boolean;
  jsonSyntaxValid: boolean;
  schemaValid: boolean;
  errors: string[];
  warnings: string[];
  serverErrors: { [serverName: string]: string[] };
}

function transformWindsurfConfig(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  const transformed = { ...data } as Record<string, unknown>;
  const servers = (transformed.mcpServers || {}) as Record<string, unknown>;

  for (const [, serverConfig] of Object.entries(servers)) {
    if (typeof serverConfig === "object" && serverConfig !== null) {
      const config = serverConfig as Record<string, unknown>;

      if (config.url && !config.serverUrl) {
        config.serverUrl = config.url;
        delete config.url;
      }
    }
  }

  return transformed;
}

export function RawConfigEditor({
  editorType,
  configType,
}: RawConfigEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [configContent, setConfigContent] = useState<string>("");
  const [configPath, setConfigPath] = useState<string>("");
  const [availableConfigTypes, setAvailableConfigTypes] = useState<
    ("global" | "workspace" | "user")[]
  >([]);
  const [selectedConfigType, setSelectedConfigType] = useState<
    "global" | "workspace" | "user"
  >(configType || "global");
  const [editorManager] = useState(() => new EditorManager());

  const editorConfig = getEditorConfig(editorType);

  useEffect(() => {
    loadConfigContent();
  }, [editorType, selectedConfigType]);

  useEffect(() => {
    const service = editorManager.getService(editorType);
    const types: ("global" | "workspace" | "user")[] = [];

    if (editorType === "vscode") {
      if (service.supportsConfigType("user")) types.push("user");
      if (service.supportsConfigType("workspace")) types.push("workspace");
    } else {
      if (service.supportsConfigType("global")) types.push("global");
      if (service.supportsConfigType("workspace")) types.push("workspace");
      if (service.supportsConfigType("user")) types.push("user");
    }

    setAvailableConfigTypes(types);

    if (!configType && types.length > 0) {
      let defaultType = types[0];
      if (editorType === "vscode") {
        if (
          types.includes("workspace") &&
          service.isConfigTypeAvailable("workspace")
        ) {
          defaultType = "workspace";
        } else if (types.includes("user")) {
          defaultType = "user";
        }
      } else {
        defaultType = types[0];
      }

      setSelectedConfigType(defaultType);
    }
  }, [editorType]);

  async function loadConfigContent() {
    try {
      setIsLoading(true);
      const service = editorManager.getService(editorType);

      let effectiveConfigType = selectedConfigType;
      if (editorType === "vscode" && selectedConfigType === "global") {
        effectiveConfigType = "user";
      }

      if (!service.isConfigTypeAvailable(effectiveConfigType)) {
        setConfigContent("");
        setConfigPath("");

        let message = `${editorConfig.displayName} doesn't support ${effectiveConfigType} configuration in this context`;

        if (editorType === "vscode" && selectedConfigType === "workspace") {
          message =
            "VS Code workspace configuration is only available when you're in a valid project workspace. Try switching to 'user' configuration instead.";
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Config type not available",
          message: message,
        });
        return;
      }

      const path = service.getConfigPath(effectiveConfigType);

      if (!path) {
        setConfigContent("");
        setConfigPath("");

        await showToast({
          style: Toast.Style.Failure,
          title: "Config type not supported",
          message: `${editorConfig.displayName} doesn't support ${effectiveConfigType} configuration`,
        });
        return;
      }

      setConfigPath(path);

      if (!existsSync(path)) {
        const emptyConfig = getEmptyConfigStructure(
          editorType,
          selectedConfigType,
        );
        setConfigContent(JSON.stringify(emptyConfig, null, 2));

        await showToast({
          style: Toast.Style.Success,
          title: "Config file not found",
          message: "Showing empty configuration structure",
        });
        return;
      }

      const content = await readFile(path, "utf-8");

      if (
        editorType === "vscode" &&
        (selectedConfigType === "user" || selectedConfigType === "global")
      ) {
        try {
          const { isValid, data } = validateJSONStructure(content);
          if (isValid && data && typeof data === "object") {
            const settingsData = data as { mcp?: unknown };
            const mcpSection = settingsData.mcp || {};
            setConfigContent(JSON.stringify(mcpSection, null, 2));
          } else {
            setConfigContent(content);
          }
        } catch {
          setConfigContent(content);
        }
      } else {
        setConfigContent(content);
      }
    } catch (error) {
      console.error("Error loading config:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load config",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveConfigContent(newContent: string) {
    try {
      if (!configPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot save configuration",
          message: `${editorConfig.displayName} ${selectedConfigType} configuration is not supported in this context`,
        });
        return { success: false, formattedContent: newContent };
      }

      let formattedContent = newContent;
      try {
        const parsedJson = JSON.parse(newContent);

        const transformedJson =
          editorType === "windsurf"
            ? transformWindsurfConfig(parsedJson)
            : parsedJson;

        formattedContent = JSON.stringify(transformedJson, null, 2);
      } catch {
        // Note: We'll catch any JSON syntax errors in validation below
      }

      const validationResult = performComprehensiveValidation(formattedContent);

      if (!validationResult.jsonSyntaxValid) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid JSON Syntax",
          message:
            validationResult.errors[0] ||
            "The configuration contains invalid JSON",
        });
        return { success: false, formattedContent: newContent };
      }

      if (!validationResult.schemaValid) {
        const errorCount = validationResult.errors.length;
        const serverErrorCount = Object.keys(
          validationResult.serverErrors,
        ).length;

        let message = "";
        if (validationResult.errors.length > 0) {
          message = validationResult.errors[0];
          if (errorCount > 1) message += ` (+${errorCount - 1} more)`;
        }
        if (serverErrorCount > 0) {
          if (message) message += "; ";
          message += `${serverErrorCount} server(s) invalid`;
        }

        await showToast({
          style: Toast.Style.Failure,
          title: `Invalid Configuration`,
          message: message,
        });
        return { success: false, formattedContent: newContent };
      }

      if (validationResult.warnings.length > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "Saved with warnings",
          message: `${validationResult.warnings.length} warning${validationResult.warnings.length > 1 ? "s" : ""} found`,
        });
      }

      const dir = dirname(configPath);
      await mkdir(dir, { recursive: true });

      let finalContent = formattedContent;
      if (
        editorType === "vscode" &&
        (selectedConfigType === "user" || selectedConfigType === "global")
      ) {
        try {
          const existingContent = existsSync(configPath)
            ? await readFile(configPath, "utf-8")
            : "{}";
          const { isValid: existingValid, data: existingData } =
            validateJSONStructure(existingContent);

          const { isValid: newValid, data: newMcpData } =
            validateJSONStructure(formattedContent);

          if (
            existingValid &&
            newValid &&
            existingData &&
            typeof existingData === "object"
          ) {
            const fullSettings = {
              ...(existingData as object),
              mcp: newMcpData,
            };
            finalContent = JSON.stringify(fullSettings, null, 2);
          }
        } catch (error) {
          console.warn(
            "Could not merge MCP section into settings.json, saving as-is:",
            error,
          );
        }
      }

      await writeFile(configPath, finalContent, "utf-8");

      setConfigContent(formattedContent);

      await showToast({
        style: Toast.Style.Success,
        title: "Configuration saved",
        message: `Saved to ${basename(configPath)}`,
      });

      return { success: true, formattedContent };
    } catch (error) {
      console.error("Error saving config:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save config",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return { success: false, formattedContent: newContent };
    }
  }

  function performComprehensiveValidation(content: string): ValidationState {
    const result: ValidationState = {
      isValid: false,
      jsonSyntaxValid: false,
      schemaValid: false,
      errors: [],
      warnings: [],
      serverErrors: {},
    };

    const { isValid: jsonValid, data, error } = validateJSONStructure(content);
    result.jsonSyntaxValid = jsonValid;

    if (!jsonValid) {
      result.errors.push(error || "Invalid JSON format");
      return result;
    }

    try {
      const service = editorManager.getService(editorType);

      let validationData = data;
      let validationConfigType = selectedConfigType;

      if (editorType === "windsurf") {
        validationData = transformWindsurfConfig(data);
      }

      if (editorType === "vscode" && selectedConfigType === "user") {
        validationData = { mcp: validationData };
        validationConfigType = "user";
      }

      const structureValidation = service.validateConfigStructure(
        validationData,
        validationConfigType,
      );

      if (!structureValidation.isValid) {
        result.errors.push(...structureValidation.errors.map((e) => e.message));
      }

      if (
        structureValidation.warnings &&
        structureValidation.warnings.length > 0
      ) {
        result.warnings.push(
          ...structureValidation.warnings.map((w) => w.message),
        );
      }

      result.schemaValid = structureValidation.isValid;

      if (structureValidation.isValid) {
        const servers = service.parseConfigData(
          validationData,
          validationConfigType,
        );

        servers.forEach((serverWithMetadata) => {
          const serverValidation = validateMCPServerConfig(
            serverWithMetadata.config,
            editorType,
          );
          if (!serverValidation.isValid) {
            const serverName =
              serverWithMetadata.config.name || "Unnamed Server";
            result.serverErrors[serverName] = serverValidation.errors.map(
              (e) => e.message,
            );
            result.schemaValid = false;
          }
        });
      }

      result.isValid =
        result.jsonSyntaxValid &&
        result.schemaValid &&
        Object.keys(result.serverErrors).length === 0;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Schema validation failed",
      );
    }

    return result;
  }

  function handleConfigTypeChange(
    newConfigType: "global" | "workspace" | "user",
  ) {
    setSelectedConfigType(newConfigType);
  }

  function getValidationStatus(): { icon: Icon; text: string; color: Color } {
    if (!configContent.trim()) {
      return { icon: Icon.Document, text: "Empty", color: Color.SecondaryText };
    }

    const validation = performComprehensiveValidation(configContent);

    if (!validation.jsonSyntaxValid) {
      return { icon: Icon.XMarkCircle, text: "Invalid JSON", color: Color.Red };
    }

    if (
      !validation.schemaValid ||
      Object.keys(validation.serverErrors).length > 0
    ) {
      return {
        icon: Icon.XMarkCircle,
        text: "Schema errors",
        color: Color.Red,
      };
    }

    if (validation.warnings.length > 0) {
      return { icon: Icon.Warning, text: "Warnings", color: Color.Yellow };
    }

    return { icon: Icon.CheckCircle, text: "Valid", color: Color.Green };
  }

  const validationStatus = getValidationStatus();

  const markdown = `
\`\`\`json
${configContent}
\`\`\``;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`${editorConfig.displayName} Raw Config`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Editor"
            text={editorConfig.displayName}
            icon={editorConfig.icon}
          />
          <Detail.Metadata.Label
            title="Config Type"
            text={
              editorType === "vscode" && selectedConfigType === "user"
                ? "User (MCP section only)"
                : selectedConfigType
            }
          />
          {configPath ? (
            <Detail.Metadata.Link
              title="File Name"
              text={basename(configPath)}
              target={`file://${configPath}`}
            />
          ) : (
            <Detail.Metadata.Label title="File Name" text="Not available" />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Validation Status"
            text={{
              value: validationStatus.text,
              color: validationStatus.color,
            }}
            icon={validationStatus.icon}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Supported Transports"
            text={editorConfig.supportedTransports.join(", ")}
          />
          <Detail.Metadata.Label
            title="Supports Inputs"
            text={editorConfig.supportsInputs ? "Yes" : "No"}
          />
          {editorConfig.maxTools && (
            <Detail.Metadata.Label
              title="Max Tools"
              text={editorConfig.maxTools.toString()}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {configPath && (
              <Action.Push
                title="Edit Raw Config"
                icon={Icon.Pencil}
                target={
                  <RawConfigEditForm
                    editorType={editorType}
                    configType={selectedConfigType}
                    initialContent={configContent}
                    onSave={saveConfigContent}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={loadConfigContent}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Push
              title="View Examples & Help"
              icon={Icon.QuestionMarkCircle}
              target={
                <RawConfigHelpScreen
                  editorType={editorType}
                  configType={selectedConfigType}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel.Section>

          {availableConfigTypes.length > 1 && (
            <ActionPanel.Section title="Config Type">
              {availableConfigTypes.map((type) => (
                <Action
                  key={type}
                  title={`Switch to ${type}`}
                  icon={
                    type === selectedConfigType ? Icon.CheckCircle : Icon.Circle
                  }
                  onAction={() => handleConfigTypeChange(type)}
                />
              ))}
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            {configPath && (
              <Action.CopyToClipboard
                title="Copy Config Path"
                content={configPath}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onCopy={() => {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Path Copied",
                    message: "Configuration file path copied to clipboard",
                  });
                }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Raw Config"
              content={configContent}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onCopy={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Config Copied",
                  message: "Raw configuration copied to clipboard",
                });
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.OpenWith
              title="Open in External Editor"
              path={configPath}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function RawConfigHelpScreen({
  editorType,
  configType,
}: {
  editorType: EditorType;
  configType: "global" | "workspace" | "user";
}) {
  const { pop } = useNavigation();
  const editorConfig = getEditorConfig(editorType);

  const helpMarkdown = `
# ${editorConfig.displayName} MCP Configuration Help

${getSchemaDescription(editorType)}

---

## Configuration Patterns

${getEditorGuidance(editorType)}

---

## Quick Actions

- **Copy Example Config**: Complete examples showing both remote and local patterns
- **Copy Remote Config**: Hosted service pattern (requires internet)
- **Copy Local Config**: Local execution pattern (runs via NPX)

*Note: Context7 is used as a practical example demonstrating both remote and local deployment patterns.*
`;

  return (
    <Detail
      markdown={helpMarkdown}
      navigationTitle={`${editorConfig.displayName} Configuration Help`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Editor"
            text={editorConfig.displayName}
            icon={{ source: editorConfig.icon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Label title="Config Type" text={configType} />
          <Detail.Metadata.Label title="Mode" text="Help & Examples" />
          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Example Type"
            text="Context7 (Demo)"
            icon={Icon.MagnifyingGlass}
          />
          <Detail.Metadata.Label
            title="Remote Pattern"
            text="Hosted service URL"
            icon={Icon.Globe}
          />
          <Detail.Metadata.Label
            title="Local Pattern"
            text="NPX command execution"
            icon={Icon.Terminal}
          />
          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Supported Transports"
            text={editorConfig.supportedTransports.join(", ")}
          />
          <Detail.Metadata.Label
            title="Supports Inputs"
            text={editorConfig.supportsInputs ? "Yes" : "No"}
          />
          {editorConfig.maxTools && (
            <Detail.Metadata.Label
              title="Max Tools"
              text={editorConfig.maxTools.toString()}
            />
          )}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="MCP Concepts" text="Remote vs Local" />
          <Detail.Metadata.Label
            title="Configuration"
            text="Commands, Args, Env"
          />
          <Detail.Metadata.Label
            title="Transport Types"
            text="stdio, sse, http"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Go Back to Editor"
              icon={Icon.ArrowLeft}
              onAction={pop}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
            <Action.CopyToClipboard
              title="Copy Example Config"
              content={getSchemaExampleJson(editorType, configType)}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onCopy={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Example Config Copied",
                  message: "Configuration template copied to clipboard",
                });
              }}
            />
            <Action.CopyToClipboard
              title="Copy Remote Config"
              content={getRemoteConfigExample(editorType, configType)}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onCopy={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Remote Config Copied",
                  message: "Remote server configuration copied to clipboard",
                });
              }}
            />
            <Action.CopyToClipboard
              title="Copy Local Config"
              content={getLocalConfigExample(editorType, configType)}
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onCopy={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Local Config Copied",
                  message: "Local server configuration copied to clipboard",
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function RawConfigEditForm({
  editorType,
  configType,
  initialContent,
  onSave,
}: {
  editorType: EditorType;
  configType: "global" | "workspace" | "user";
  initialContent: string;
  onSave: (
    content: string,
  ) => Promise<{ success: boolean; formattedContent: string }>;
}) {
  const [content, setContent] = useState(initialContent);
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    jsonSyntaxValid: true,
    schemaValid: true,
    errors: [],
    warnings: [],
    serverErrors: {},
  });
  const { pop } = useNavigation();
  const editorConfig = getEditorConfig(editorType);
  const [editorManager] = useState(() => new EditorManager());

  useEffect(() => {
    if (!content.trim()) {
      setValidationState({
        isValid: true,
        jsonSyntaxValid: true,
        schemaValid: true,
        errors: [],
        warnings: [],
        serverErrors: {},
      });
      return;
    }

    const result = performComprehensiveValidation(content);
    setValidationState(result);
  }, [content, editorType, configType]);

  function performComprehensiveValidation(content: string): ValidationState {
    const result: ValidationState = {
      isValid: false,
      jsonSyntaxValid: false,
      schemaValid: false,
      errors: [],
      warnings: [],
      serverErrors: {},
    };

    const { isValid: jsonValid, data, error } = validateJSONStructure(content);
    result.jsonSyntaxValid = jsonValid;

    if (!jsonValid) {
      result.errors.push(error || "Invalid JSON format");
      return result;
    }

    try {
      const service = editorManager.getService(editorType);

      const validationData =
        editorType === "windsurf" ? transformWindsurfConfig(data) : data;

      const structureValidation = service.validateConfigStructure(
        validationData,
        configType,
      );

      if (!structureValidation.isValid) {
        result.errors.push(...structureValidation.errors.map((e) => e.message));
      }

      if (
        structureValidation.warnings &&
        structureValidation.warnings.length > 0
      ) {
        result.warnings.push(
          ...structureValidation.warnings.map((w) => w.message),
        );
      }

      result.schemaValid = structureValidation.isValid;

      if (structureValidation.isValid) {
        const servers = service.parseConfigData(validationData, configType);

        servers.forEach((serverWithMetadata) => {
          const serverValidation = validateMCPServerConfig(
            serverWithMetadata.config,
            editorType,
          );
          if (!serverValidation.isValid) {
            const serverName =
              serverWithMetadata.config.name || "Unnamed Server";
            result.serverErrors[serverName] = serverValidation.errors.map(
              (e) => e.message,
            );
            result.schemaValid = false;
          }
        });
      }

      result.isValid =
        result.jsonSyntaxValid &&
        result.schemaValid &&
        Object.keys(result.serverErrors).length === 0;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Schema validation failed",
      );
    }

    return result;
  }

  async function handleSubmit() {
    if (!validationState.isValid) {
      let message = "Please fix validation errors before saving:";
      if (!validationState.jsonSyntaxValid) {
        message = "Please fix JSON syntax errors before saving";
      } else if (!validationState.schemaValid) {
        message = "Please fix schema validation errors before saving";
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot save invalid configuration",
        message: message,
      });
      return;
    }

    const { success, formattedContent } = await onSave(content);
    if (success) {
      setContent(formattedContent);
      pop();
    }
  }

  async function handleRestore() {
    const confirmed = await confirmAlert({
      title: "Restore to Original",
      message:
        "Are you sure you want to restore the original content? Your changes will be lost.",
      primaryAction: {
        title: "Restore",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      setContent(initialContent);
    }
  }

  return (
    <Form
      navigationTitle={`Edit ${editorConfig.displayName} Config`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title="Save Configuration"
              icon={
                validationState.isValid ? Icon.CheckCircle : Icon.XMarkCircle
              }
              onSubmit={handleSubmit}
              shortcut={
                validationState.isValid
                  ? { modifiers: ["cmd"], key: "s" }
                  : undefined
              }
            />
            <Action
              title="Restore Original"
              icon={Icon.Undo}
              style={Action.Style.Destructive}
              onAction={handleRestore}
              shortcut={{ modifiers: ["cmd"], key: "z" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Push
              title="View Examples & Help"
              icon={Icon.QuestionMarkCircle}
              target={
                <RawConfigHelpScreen
                  editorType={editorType}
                  configType={configType}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Current Content"
              content={content}
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onCopy={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Content Copied",
                  message: "Current configuration copied to clipboard",
                });
              }}
            />
            <Action.CopyToClipboard
              title="Copy Example Config"
              content={getSchemaExampleJson(editorType, configType)}
              icon={Icon.CodeBlock}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onCopy={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Example Config Copied",
                  message: "Configuration template copied to clipboard",
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title={
          editorType === "vscode" && configType === "user"
            ? "MCP Configuration"
            : "Raw Configuration"
        }
        placeholder={
          editorType === "vscode" && configType === "user"
            ? 'Enter MCP section content (e.g., { "servers": {}, "inputs": [] })...'
            : `Enter valid JSON configuration for ${editorConfig.displayName}...`
        }
        value={content}
        onChange={setContent}
        enableMarkdown={false}
        error={
          !validationState.isValid
            ? "Configuration contains validation errors"
            : undefined
        }
      />
    </Form>
  );
}

function getRemoteConfigExample(
  editorType: EditorType,
  configType?: "global" | "workspace" | "user",
): string {
  switch (editorType) {
    case "cursor":
      return `"context7": {
  "url": "https://mcp.context7.com/mcp"
}`;

    case "windsurf":
      return `"context7": {
  "serverUrl": "https://mcp.context7.com/sse"
}`;

    case "vscode":
      if (configType === "user") {
        return `{
  "servers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}`;
      }
      return `{
  "mcp": {
    "servers": {
      "context7": {
        "type": "http",
        "url": "https://mcp.context7.com/mcp"
      }
    }
  }
}`;

    default:
      return "{}";
  }
}

function getLocalConfigExample(
  editorType: EditorType,
  configType?: "global" | "workspace" | "user",
): string {
  switch (editorType) {
    case "cursor":
      return `"context7": {
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"]
}`;

    case "windsurf":
      return `"context7": {
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"]
}`;

    case "vscode":
      if (configType === "user") {
        return `{
  "servers": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "DEFAULT_MINIMUM_TOKENS": "6000"
      }
    }
  }
}`;
      }
      return `{
  "mcp": {
    "servers": {
      "context7": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp"],
        "env": {
          "DEFAULT_MINIMUM_TOKENS": "6000"
        }
      }
    }
  }
}`;

    default:
      return "{}";
  }
}

function getSchemaExampleJson(
  editorType: EditorType,
  configType?: "global" | "workspace" | "user",
): string {
  switch (editorType) {
    case "cursor":
      return `{
  "mcpServers": {
    "context7-remote": {
      "url": "https://mcp.context7.com/mcp"
    },
    "context7-local": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "DEFAULT_MINIMUM_TOKENS": "6000"
      }
    }
  }
}`;

    case "windsurf":
      return `{
  "mcpServers": {
    "context7-remote": {
      "serverUrl": "https://mcp.context7.com/sse"
    },
    "context7-local": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "DEFAULT_MINIMUM_TOKENS": "6000"
      }
    }
  }
}`;

    case "vscode":
      if (configType === "user") {
        return `{
  "servers": {
    "context7-remote": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    },
    "context7-local": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "DEFAULT_MINIMUM_TOKENS": "6000"
      }
    }
  }
}`;
      }
      return `{
  "mcp": {
    "servers": {
      "context7-remote": {
        "type": "http",
        "url": "https://mcp.context7.com/mcp"
      },
      "context7-local": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp"],
        "env": {
          "DEFAULT_MINIMUM_TOKENS": "6000"
        }
      }
    }
  }
}`;

    default:
      return "{}";
  }
}

function getEmptyConfigStructure(
  editorType: EditorType,
  configType?: string,
): object {
  switch (editorType) {
    case "cursor":
      return { mcpServers: {} };
    case "windsurf":
      return {};
    case "vscode":
      if (configType === "user") {
        return { servers: {}, inputs: [] };
      }
      return { servers: {}, inputs: [] };
    default:
      return {};
  }
}

function getEditorGuidance(editorType: EditorType): string {
  switch (editorType) {
    case "cursor":
      return `**Cursor MCP Configuration**: Use \`mcpServers\` as root object. 

**Remote vs Local Example**: Context7 demonstrates both patterns:
- **Remote**: \`"url": "https://mcp.context7.com/mcp"\` (hosted service)
- **Local**: \`"command": "npx", "args": ["-y", "@upstash/context7-mcp"]\` (local execution)

**Key Concepts**: Remote servers use URLs, local servers use command + args. Environment variables can customize behavior.`;
    case "windsurf":
      return `**Windsurf MCP Configuration**: Use \`mcpServers\` structure with server objects.

**Remote vs Local Example**: Context7 demonstrates both patterns:
- **Remote**: \`"serverUrl": "https://mcp.context7.com/sse"\` (SSE endpoint)
- **Local**: \`"command": "npx", "args": ["-y", "@upstash/context7-mcp"]\` (local execution)

**Key Concepts**: Remote servers use serverUrl for SSE, local servers use command + args. Environment variables customize server behavior.`;
    case "vscode":
      return `**VS Code MCP Configuration**: Use \`servers\` object with explicit transport types.

**Remote vs Local Example**: Context7 demonstrates both patterns:
- **Remote**: \`"type": "http", "url": "https://mcp.context7.com/mcp"\` (HTTP transport)
- **Local**: \`"type": "stdio", "command": "npx", "args": ["-y", "@upstash/context7-mcp"]\` (stdio transport)

**Key Concepts**: VS Code requires explicit transport types. Remote uses http/sse, local uses stdio. Environment variables and inputs provide configuration.`;
    default:
      return "";
  }
}

function getSchemaDescription(editorType: EditorType): string {
  switch (editorType) {
    case "cursor":
      return `**Cursor Remote Server Connection**
\`\`\`json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
\`\`\`

**Cursor Local Server Connection**
\`\`\`json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
\`\`\``;

    case "windsurf":
      return `**Windsurf Remote Server Connection**
\`\`\`json
{
  "mcpServers": {
    "context7": {
      "serverUrl": "https://mcp.context7.com/sse"
    }
  }
}
\`\`\`

**Windsurf Local Server Connection**
\`\`\`json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
\`\`\``;

    case "vscode":
      return `**VS Code Remote Server Connection**
\`\`\`json
{
  "mcp": {
    "servers": {
      "context7": {
        "type": "http",
        "url": "https://mcp.context7.com/mcp"
      }
    }
  }
}
\`\`\`

**VS Code Local Server Connection**
\`\`\`json
{
  "mcp": {
    "servers": {
      "context7": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp"],
        "env": {
          "DEFAULT_MINIMUM_TOKENS": "6000"
        }
      }
    }
  }
}
\`\`\``;

    default:
      return "**JSON object with editor-specific structure**";
  }
}
