import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { EditorManager } from "./services/EditorManager";
import {
  EditorType,
  MCPServerConfig,
  VSCodeMCPServerConfig,
  VSCodeInput,
  TransportType,
} from "./types/mcpServer";
import { showFailureToast } from "@raycast/utils";
import { getEditorConfig, SUCCESS_MESSAGES } from "./utils/constants";
import { VSCodeEditorService } from "./services/VSCodeEditorService";
import { validateLockedServersPresent } from "./utils/protectedServers";

type FormValues = {
  editor: EditorType;
  name: string;
  description: string;
  disabled: boolean;
  transport: TransportType;
  command: string;
  args: string;
  url: string;
  serverUrl: string;
  env: string;
  envFile: string;
  roots: string;
  headers: string;
};

function VSCodeInputForm({
  inputId,
  setInputId,
  inputDescription,
  setInputDescription,
  isPassword,
  setIsPassword,
  existingInputs,
}: {
  inputId: string;
  setInputId: (value: string) => void;
  inputDescription: string;
  setInputDescription: (value: string) => void;
  isPassword: boolean;
  setIsPassword: (value: boolean) => void;
  existingInputs: VSCodeInput[];
}) {
  const isDuplicate = existingInputs.some(
    (input) => input.id === inputId.trim(),
  );

  return (
    <>
      <Form.TextField
        id="newInputId"
        title="New Input ID"
        value={inputId}
        onChange={setInputId}
        placeholder="api-key"
        info="Unique identifier for this input (lowercase with hyphens)"
        error={
          isDuplicate
            ? `Input with ID "${inputId.trim()}" already exists`
            : undefined
        }
      />

      <Form.TextField
        id="newInputDescription"
        title="Input Description"
        value={inputDescription}
        onChange={setInputDescription}
        placeholder="API Key for external service"
        info="User-friendly description shown when prompting"
      />

      <Form.Checkbox
        id="newInputPassword"
        title="Password Input"
        label="Treat as password (masked input)"
        value={isPassword}
        onChange={setIsPassword}
        info="Enable for sensitive values like API keys"
      />

      <Form.Description
        text={`Preview: ${inputId.trim() || "[id]"} - ${inputDescription.trim() || "[description]"}${isPassword ? " (password)" : ""}`}
      />

      {inputId.trim() && inputDescription.trim() && !isDuplicate && (
        <Form.Description text="Use Cmd+I to add this input" />
      )}
    </>
  );
}

export default function Command() {
  const [selectedEditor, setSelectedEditor] = useState<EditorType>("cursor");

  const getInitialTransport = (): TransportType => {
    const editorConfig = getEditorConfig("cursor");
    const supportedTransports = editorConfig.supportedTransports;

    if (supportedTransports.includes("sse")) return "sse";
    if (supportedTransports.includes("/sse")) return "/sse";
    return "stdio";
  };

  const [selectedTransport, setSelectedTransport] = useState<TransportType>(
    getInitialTransport(),
  );
  const [selectedConfigType, setSelectedConfigType] = useState<
    "workspace" | "user"
  >("user");
  const [editorManager] = useState(() => new EditorManager());
  const [workspaceInputs, setWorkspaceInputs] = useState<VSCodeInput[]>([]);
  const [userInputs, setUserInputs] = useState<VSCodeInput[]>([]);
  const [showInputManagement, setShowInputManagement] = useState(false);
  const [newInputId, setNewInputId] = useState("");
  const [newInputDescription, setNewInputDescription] = useState("");
  const [newInputIsPassword, setNewInputIsPassword] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding server...",
      });

      const serverConfig = buildServerConfig(values);

      const currentServers = await editorManager.readAllServers();
      const currentServerNames = currentServers.map((s) => s.config.name);
      const updatedServerNames = [...currentServerNames, serverConfig.name];

      const validation = await validateLockedServersPresent(
        updatedServerNames,
        selectedEditor,
        currentServerNames,
      );
      if (!validation.isValid) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot add server",
          message: validation.message,
        });
        return;
      }

      if (selectedEditor === "vscode") {
        await editorManager.addServer(
          selectedEditor,
          serverConfig,
          selectedConfigType,
        );
      } else {
        await editorManager.addServer(selectedEditor, serverConfig);
      }

      await showToast({
        style: Toast.Style.Success,
        title: SUCCESS_MESSAGES.SERVER_ADDED,
        message: `${values.name} added to ${getEditorConfig(selectedEditor).displayName}`,
      });

      pop();
    } catch (error) {
      console.error("Failed to add server:", error);
      showFailureToast(error, { title: "Failed to add server" });
    }
  }

  function parseArguments(argsString: string): string[] | undefined {
    if (!argsString.trim()) return undefined;

    const input = argsString.trim();

    if (input.startsWith("[") && input.endsWith("]")) {
      try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) {
          return parsed
            .map((arg) => String(arg))
            .filter((arg) => arg.length > 0);
        }
      } catch {
        // Note: Fall through to other parsing methods
      }
    }

    const hasCommas = input.includes(",");

    let rawArgs: string[];

    if (hasCommas) {
      const normalizedInput = input.replace(/\n/g, " ");
      rawArgs = normalizedInput.split(",");
    } else {
      rawArgs = input.split("\n");
    }

    return rawArgs
      .map((arg) => {
        let trimmed = arg.trim();

        while (
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ) {
          trimmed = trimmed.slice(1, -1);
        }

        return trimmed;
      })
      .filter((arg) => arg.length > 0);
  }

  function buildServerConfig(values: FormValues): MCPServerConfig {
    const baseConfig = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      ...(selectedEditor !== "cursor" && { disabled: values.disabled }),
    };

    console.log(
      `Building ${selectedEditor} server config with transport ${selectedTransport}`,
    );
    console.log("Form values:", values);

    if (selectedEditor === "vscode") {
      if (selectedTransport === "stdio") {
        if (!values.command) {
          throw new Error("Command is required for stdio transport");
        }
        return {
          ...baseConfig,
          type: "stdio" as const,
          command: values.command.trim(),
          args: values.args ? parseArguments(values.args) : undefined,
          env: values.env ? parseEnvironmentVariables(values.env) : undefined,
          envFile: values.envFile?.trim() || undefined,
        } as VSCodeMCPServerConfig;
      } else if (selectedTransport === "sse") {
        if (!values.url) {
          throw new Error("URL is required for SSE transport");
        }
        return {
          ...baseConfig,
          type: "sse" as const,
          url: values.url.trim(),
          headers: values.headers?.trim()
            ? JSON.parse(values.headers.trim())
            : undefined,
          envFile: values.envFile?.trim() || undefined,
          roots: values.roots?.trim()
            ? values.roots
                .split("\n")
                .map((root) => root.trim())
                .filter((root) => root.length > 0)
            : undefined,
        } as VSCodeMCPServerConfig;
      } else if (selectedTransport === "http") {
        if (!values.url) {
          throw new Error("URL is required for HTTP transport");
        }
        return {
          ...baseConfig,
          type: "http" as const,
          url: values.url.trim(),
          headers: values.headers?.trim()
            ? JSON.parse(values.headers.trim())
            : undefined,
          envFile: values.envFile?.trim() || undefined,
          roots: values.roots?.trim()
            ? values.roots
                .split("\n")
                .map((root) => root.trim())
                .filter((root) => root.length > 0)
            : undefined,
        } as VSCodeMCPServerConfig;
      } else {
        throw new Error(
          `Unsupported transport type for VS Code: ${selectedTransport}`,
        );
      }
    } else {
      if (selectedTransport === "stdio") {
        if (!values.command) {
          throw new Error("Command is required for stdio transport");
        }
        return {
          ...baseConfig,
          transport: "stdio" as const,
          command: values.command.trim(),
          args: values.args ? parseArguments(values.args) : undefined,
          env: values.env ? parseEnvironmentVariables(values.env) : undefined,
        };
      } else if (selectedTransport === "sse") {
        if (!values.url) {
          throw new Error("URL is required for SSE transport");
        }
        return {
          ...baseConfig,
          transport: "sse" as const,
          url: values.url.trim(),
        };
      } else if (selectedTransport === "/sse") {
        if (!values.serverUrl) {
          throw new Error("Server URL is required for Windsurf SSE transport");
        }
        return {
          ...baseConfig,
          transport: "/sse" as const,
          serverUrl: values.serverUrl.trim(),
        };
      } else {
        if (!values.url) {
          throw new Error("URL is required for HTTP transport");
        }
        return {
          ...baseConfig,
          transport: "http" as const,
          url: values.url.trim(),
        } as MCPServerConfig;
      }
    }
  }

  function parseEnvironmentVariables(
    envString: string,
  ): Record<string, string> | undefined {
    if (!envString.trim()) return undefined;

    const env: Record<string, string> = {};
    const lines = envString.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=");
        if (key.trim() && value.trim()) {
          env[key.trim()] = value.trim();
        }
      }
    }

    return Object.keys(env).length > 0 ? env : undefined;
  }

  function getAvailableTransports(): Array<{
    label: string;
    value: TransportType;
  }> {
    const editorConfig = getEditorConfig(selectedEditor);
    return editorConfig.supportedTransports.map((transport) => ({
      label:
        transport === "stdio"
          ? "Standard I/O (stdio) - [Local Server]"
          : transport === "sse"
            ? "Server-Sent Events (SSE) - [Remote Server]"
            : transport === "/sse"
              ? "Server-Sent Events (SSE) - [Remote Server]"
              : "HTTP - [Remote Server]",
      value: transport as TransportType,
    }));
  }

  useEffect(() => {
    const availableTransports = getAvailableTransports();

    let defaultTransport: TransportType;

    switch (selectedEditor) {
      case "cursor":
        defaultTransport =
          (availableTransports.find((t) => t.value === "sse")
            ?.value as TransportType) || "sse";
        break;
      case "vscode":
        defaultTransport =
          (availableTransports.find((t) => t.value === "http")
            ?.value as TransportType) || "http";
        break;
      case "windsurf":
        defaultTransport =
          (availableTransports.find((t) => t.value === "/sse")
            ?.value as TransportType) || "/sse";
        break;
      default:
        defaultTransport =
          (availableTransports.find((t) => t.value === "stdio")
            ?.value as TransportType) || "stdio";
        break;
    }

    setSelectedTransport(defaultTransport);
  }, [selectedEditor]);

  useEffect(() => {
    if (selectedEditor === "vscode") {
      loadVSCodeInputs();
    }
  }, [selectedEditor]);

  async function loadVSCodeInputs() {
    try {
      const vscodeService = editorManager.getService(
        "vscode",
      ) as VSCodeEditorService;
      const [workspaceInputsData, userInputsData] = await Promise.all([
        vscodeService.readInputs("workspace"),
        vscodeService.readInputs("user"),
      ]);
      setWorkspaceInputs(workspaceInputsData);
      setUserInputs(userInputsData);
    } catch (error) {
      console.error("Failed to load VS Code inputs:", error);
    }
  }

  async function addVSCodeInput(
    input: VSCodeInput,
    configType: "workspace" | "user",
  ) {
    try {
      const vscodeService = editorManager.getService(
        "vscode",
      ) as VSCodeEditorService;
      const currentInputs =
        configType === "workspace" ? workspaceInputs : userInputs;

      if (currentInputs.some((existing) => existing.id === input.id)) {
        throw new Error(
          `Input with ID "${input.id}" already exists in ${configType} configuration`,
        );
      }

      const updatedInputs = [...currentInputs, input];
      await vscodeService.writeInputs(updatedInputs, configType);

      if (configType === "workspace") {
        setWorkspaceInputs(updatedInputs);
      } else {
        setUserInputs(updatedInputs);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Input added",
        message: `Added "${input.id}" to ${configType} inputs`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add input",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function removeVSCodeInput(
    inputId: string,
    configType: "workspace" | "user",
  ) {
    try {
      const vscodeService = editorManager.getService(
        "vscode",
      ) as VSCodeEditorService;
      const currentInputs =
        configType === "workspace" ? workspaceInputs : userInputs;
      const updatedInputs = currentInputs.filter(
        (input) => input.id !== inputId,
      );

      await vscodeService.writeInputs(updatedInputs, configType);

      if (configType === "workspace") {
        setWorkspaceInputs(updatedInputs);
      } else {
        setUserInputs(updatedInputs);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Input removed",
        message: `Removed "${inputId}" from ${configType} inputs`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove input",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function renderVSCodeInputManagement() {
    if (selectedEditor !== "vscode") return null;

    const currentInputs =
      selectedConfigType === "workspace" ? workspaceInputs : userInputs;

    return (
      <>
        <Form.Separator />
        <Form.Description text="VS Code Input Management" />

        <Form.Dropdown
          id="inputConfigType"
          title="Input Configuration Level"
          value={selectedConfigType}
          onChange={(newValue) =>
            setSelectedConfigType(newValue as "workspace" | "user")
          }
          info="Choose whether to manage inputs at workspace or user level"
        >
          <Form.Dropdown.Item
            value="workspace"
            title="Workspace (.vscode/mcp.json)"
          />
          <Form.Dropdown.Item
            value="user"
            title="User Settings (settings.json)"
          />
        </Form.Dropdown>

        {currentInputs.length > 0 && (
          <>
            <Form.Description
              text={`Current ${selectedConfigType} inputs (${currentInputs.length}):`}
            />
            {currentInputs.map((input) => (
              <Form.Description
                key={input.id}
                text={`• ${input.id} - ${input.description} ${input.password ? "(password)" : ""}`}
              />
            ))}
          </>
        )}

        <Form.Checkbox
          id="showInputManagement"
          title="Input Management"
          label="Show input management controls"
          value={showInputManagement}
          onChange={setShowInputManagement}
          info="Toggle to show controls for adding/removing inputs"
        />

        {showInputManagement && (
          <>
            <VSCodeInputForm
              inputId={newInputId}
              setInputId={setNewInputId}
              inputDescription={newInputDescription}
              setInputDescription={setNewInputDescription}
              isPassword={newInputIsPassword}
              setIsPassword={setNewInputIsPassword}
              existingInputs={currentInputs}
            />

            {currentInputs.length > 0 && (
              <>
                <Form.Description text="Remove Existing Inputs:" />
                {currentInputs.map((input) => (
                  <Form.Description
                    key={`remove-${input.id}`}
                    text={`${input.id} - ${input.description}`}
                  />
                ))}
              </>
            )}
          </>
        )}

        <Form.Description text="Use \${input:input-id} syntax in environment variables, URLs, or command arguments to reference these inputs." />
      </>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Server" />

          {selectedEditor === "vscode" && showInputManagement && (
            <ActionPanel.Section title="Input Management">
              <Action
                title="Add Input"
                icon={Icon.Plus}
                onAction={() => {
                  if (newInputId.trim() && newInputDescription.trim()) {
                    const newInput: VSCodeInput = {
                      id: newInputId.trim(),
                      type: "promptString",
                      description: newInputDescription.trim(),
                      password: newInputIsPassword,
                    };
                    addVSCodeInput(newInput, selectedConfigType);
                    setNewInputId("");
                    setNewInputDescription("");
                    setNewInputIsPassword(false);
                  } else {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Invalid input",
                      message: "Both ID and description are required",
                    });
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />

              {(selectedConfigType === "workspace"
                ? workspaceInputs
                : userInputs
              ).length > 0 &&
                (selectedConfigType === "workspace"
                  ? workspaceInputs
                  : userInputs
                ).map((input) => (
                  <Action
                    key={`remove-${input.id}`}
                    title={`Remove "${input.id}"`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      removeVSCodeInput(input.id, selectedConfigType)
                    }
                  />
                ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="editor"
        title="Target Editor"
        value={selectedEditor}
        onChange={(newValue) => setSelectedEditor(newValue as EditorType)}
      >
        {editorManager.getAvailableEditors().map((editor) => {
          const config = getEditorConfig(editor);
          return (
            <Form.Dropdown.Item
              key={editor}
              value={editor}
              title={config.displayName}
              icon={config.icon}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="name"
        title="Server Name"
        placeholder="context7"
        info="Unique identifier for this MCP server"
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Up-to-date code docs for any prompt."
        info="Optional description of what this server does"
      />

      {selectedEditor !== "cursor" && (
        <Form.Checkbox
          id="disabled"
          title="Disabled"
          label="Temporarily disable this server"
          info="The server will be configured but not active"
        />
      )}

      <Form.Separator />

      <Form.Dropdown
        id="transport"
        title="Transport Type"
        value={(() => {
          const availableTransports = getAvailableTransports();
          const currentTransportIsValid = availableTransports.some(
            (t) => t.value === selectedTransport,
          );
          return currentTransportIsValid
            ? selectedTransport
            : availableTransports[0]?.value || "stdio";
        })()}
        onChange={(newValue) => setSelectedTransport(newValue as TransportType)}
        info="Method used to communicate with the server"
      >
        {getAvailableTransports().map((transport) => (
          <Form.Dropdown.Item
            key={transport.value}
            value={transport.value}
            title={transport.label}
          />
        ))}
      </Form.Dropdown>

      {selectedTransport === "stdio" && (
        <>
          <Form.TextField
            id="command"
            title="Command"
            placeholder="python -m my_mcp_server"
            info="The command to execute to start the server"
          />
          <Form.TextArea
            id="args"
            title="Arguments"
            placeholder="-p 8080 --verbose"
            info="Arguments to pass to the command (JSON array, comma-separated, or one per line)"
          />
          <Form.TextArea
            id="env"
            title="Environment Variables"
            placeholder="API_KEY=your_key"
            info="Environment variables in KEY=value format (one per line)"
          />
          <Form.TextField
            id="envFile"
            title="Environment File"
            placeholder=".env"
            info="Path to environment file for loading variables"
          />
        </>
      )}

      {selectedTransport === "sse" && (
        <Form.TextField
          id="url"
          title="Server URL"
          placeholder="https://mcp.context7.com/mcp"
          info="The remote endpoint URL for the server"
        />
      )}

      {selectedTransport === "/sse" && (
        <Form.TextField
          id="serverUrl"
          title="Server URL"
          placeholder="https://mcp.context7.com/sse"
          info="The SSE endpoint URL for the server (Windsurf format)"
        />
      )}

      {selectedTransport === "http" && (
        <Form.TextField
          id="url"
          title="Server URL"
          placeholder="http://localhost:8000"
          info="The HTTP endpoint URL for the server"
        />
      )}

      {selectedEditor === "vscode" && (
        <>
          <Form.Description text="VS Code-Specific Settings" />

          <Form.Dropdown
            id="configType"
            title="Configuration Type"
            value={selectedConfigType}
            onChange={(newValue) =>
              setSelectedConfigType(newValue as "workspace" | "user")
            }
            info="Where to save the server configuration"
          >
            <Form.Dropdown.Item value="user" title="User Settings" />
            <Form.Dropdown.Item value="workspace" title="Workspace Settings" />
          </Form.Dropdown>

          <Form.TextField
            id="envFile"
            title="Environment File"
            placeholder=".env"
            info="Path to environment file for loading variables"
          />

          {(selectedTransport === "stdio" ||
            selectedTransport === "http" ||
            selectedTransport === "sse") && (
            <Form.TextArea
              id="roots"
              title="Root Paths"
              placeholder="/path/to/project&#10;/another/path"
              info="Root paths for the server (one per line)"
            />
          )}
        </>
      )}

      {selectedEditor === "vscode" &&
        (selectedTransport === "sse" || selectedTransport === "http") && (
          <Form.TextArea
            id="headers"
            title="Headers"
            placeholder='{"Authorization": "Bearer your_token"}'
            info="HTTP headers in JSON format"
          />
        )}

      {renderVSCodeInputManagement()}
    </Form>
  );
}
