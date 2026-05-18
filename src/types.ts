// MCP Server configuration (from config file)
export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

// MCP Tool definition (from tools/list)
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

// MCP Server with its tools
export interface MCPServer {
  name: string;
  config: MCPServerConfig;
  tools: MCPTool[];
  process: import("child_process").ChildProcess | null;
  connected: boolean;
  id: number; // JSON-RPC request counter
  _handlers?: ((line: string) => void)[]; // Internal message handlers
}

// Ollama tool format (OpenAI-compatible)
export interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Ollama tool call in response
export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
  };
}
