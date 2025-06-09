import {
  MCPServerConfig,
  ValidationResult,
  MCPServerWithMetadata,
  EditorType,
} from "../types/mcpServer";
import { EditorConfig } from "../utils/constants";

export interface ServerFormField {
  id: string;
  type: "text" | "textarea" | "password" | "checkbox" | "select" | "number";
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ServerFormSection {
  title: string;
  description?: string;
  fields: ServerFormField[];
}

export abstract class BaseEditorService {
  protected editorConfig: EditorConfig;
  protected editorType: EditorType;

  constructor(editorConfig: EditorConfig) {
    this.editorConfig = editorConfig;
    this.editorType = editorConfig.id;
  }

  abstract readConfig(
    configType?: "global" | "workspace" | "user",
  ): Promise<MCPServerWithMetadata[]>;

  abstract writeConfig(
    servers: MCPServerWithMetadata[],
    configType?: "global" | "workspace" | "user",
  ): Promise<void>;

  abstract validateServerConfig(
    serverConfig: MCPServerConfig,
  ): ValidationResult;

  abstract getFormSections(
    existingConfig?: MCPServerConfig,
  ): ServerFormSection[];

  abstract parseConfigData(
    rawData: unknown,
    configType?: "global" | "workspace" | "user",
  ): MCPServerWithMetadata[];

  abstract serializeConfigData(
    servers: MCPServerWithMetadata[],
    configType?: "global" | "workspace" | "user",
  ): unknown;

  abstract getConfigPath(
    configType?: "global" | "workspace" | "user",
  ): string | null;

  abstract supportsConfigType(
    configType: "global" | "workspace" | "user",
  ): boolean;

  abstract isConfigTypeAvailable(
    configType: "global" | "workspace" | "user",
  ): boolean;

  abstract getDefaultServerConfig(): Partial<MCPServerConfig>;

  abstract validateConfigStructure(
    configData: unknown,
    configType?: "global" | "workspace" | "user",
  ): ValidationResult;

  getSupportedTransports() {
    return this.editorConfig.supportedTransports;
  }

  getEditorConfig(): EditorConfig {
    return this.editorConfig;
  }

  getEditorType(): EditorType {
    return this.editorType;
  }

  supportsInputs(): boolean {
    return this.editorConfig.supportsInputs;
  }

  getMaxTools(): number | undefined {
    return this.editorConfig.maxTools;
  }

  protected isTransportSupported(transport: string): boolean {
    return this.editorConfig.supportedTransports.includes(
      transport as "stdio" | "sse" | "/sse" | "http",
    );
  }

  protected createValidationError(
    field: string,
    message: string,
    code: string,
  ) {
    return { field, message, code };
  }

  protected createValidationWarning(
    field: string,
    message: string,
    code: string,
  ) {
    return { field, message, code };
  }
}
