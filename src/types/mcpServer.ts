export type TransportType = "stdio" | "sse" | "/sse" | "http";

export type WindsurfTransportType = "stdio" | "/sse";

export interface EnvironmentVariable {
  [key: string]: string;
}
export interface BaseMCPServerConfig {
  name: string;
  transport: TransportType;
  description?: string;
  disabled?: boolean;
}

export interface StdioTransportConfig {
  transport: "stdio";
  command: string;
  args?: string[];
  env?: EnvironmentVariable;
}

export interface SSETransportConfig {
  transport: "sse";
  url: string;
  headers?: Record<string, string>;
}

export interface WindsurfSSETransportConfig {
  transport: "/sse";
  serverUrl: string;
  headers?: Record<string, string>;
}

export interface HTTPTransportConfig {
  transport: "http";
  url: string;
  headers?: Record<string, string>;
}

export type TransportConfig = StdioTransportConfig | SSETransportConfig | HTTPTransportConfig;

export type WindsurfTransportConfig = StdioTransportConfig | WindsurfSSETransportConfig;

export interface VSCodeInput {
  id: string;
  type: "promptString";
  description: string;
  password?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CursorSpecificConfig {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WindsurfSpecificConfig {}

export interface VSCodeSpecificConfig {
  envFile?: string;
  roots?: string[];
}

export type CursorMCPServerConfig = BaseMCPServerConfig & TransportConfig & CursorSpecificConfig;

export type WindsurfMCPServerConfig = BaseMCPServerConfig & WindsurfTransportConfig & WindsurfSpecificConfig;

export type VSCodeMCPServerConfig = BaseMCPServerConfig & TransportConfig & VSCodeSpecificConfig;

export type MCPServerConfig = CursorMCPServerConfig | WindsurfMCPServerConfig | VSCodeMCPServerConfig;

export interface CursorConfigFile {
  mcpServers: Record<string, CursorMCPServerConfig>;
}

export interface WindsurfConfigFile {
  mcpServers: Record<string, WindsurfMCPServerConfig>;
}
export interface VSCodeWorkspaceConfig {
  servers: Record<string, VSCodeMCPServerConfig>;
  inputs?: VSCodeInput[];
}

export interface VSCodeUserSettings {
  mcp?: {
    servers?: Record<string, VSCodeMCPServerConfig>;
    inputs?: VSCodeInput[];
  };
  [key: string]: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface MCPServerStatus {
  id: string;
  name: string;
  status: "running" | "stopped" | "error" | "unknown";
  lastChecked?: Date;
  errorMessage?: string;
  editor: EditorType;
}

export type EditorType = "cursor" | "windsurf" | "vscode";

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

export interface MCPServerWithMetadata {
  config: MCPServerConfig;
  editor: EditorType;
  source: "workspace" | "user" | "global";
  status?: MCPServerStatus;
  lastTestResult?: ConnectionTestResult;
}

export interface VSCodeInputReference {
  inputId: string;
  serverName: string;
  field: string;
  variablePattern: string;
}

export interface VSCodeInputValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  unreferencedInputs: string[];
  missingInputs: string[];
}
