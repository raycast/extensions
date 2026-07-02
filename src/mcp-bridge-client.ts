import { MCPServer, MCPTool, OllamaTool } from "./types";

const BRIDGE_URL = "http://127.0.0.1:3456";

interface BridgeStatus {
  [name: string]: {
    connected: boolean;
    tools: string[];
  };
}

interface BridgeTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  server: string;
}

interface BridgeToolsResponse {
  tools: BridgeTool[];
}

// Check if bridge is running
export async function getBridgeStatus(): Promise<{
  running: boolean;
  servers: MCPServer[];
  toolCount: number;
}> {
  try {
    const res = await fetch(`${BRIDGE_URL}/status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error("Bridge not responding");
    const status = (await res.json()) as BridgeStatus;

    const servers: MCPServer[] = Object.entries(status).map(
      ([name, info]) => ({
        name,
        config: { command: "" },
        tools: [],
        process: null,
        connected: info.connected,
        id: 0,
      }),
    );

    // Get tools
    const toolsRes = await fetch(`${BRIDGE_URL}/tools`, {
      signal: AbortSignal.timeout(3000),
    });
    const toolsData = (await toolsRes.json()) as BridgeToolsResponse;
    const toolList = toolsData.tools || [];

    // Map tools back to servers
    for (const tool of toolList) {
      const server = servers.find((s) => s.name === tool.server);
      if (server) {
        server.tools.push({
          name: tool.name,
          description: tool.description,
        } as MCPTool);
      }
    }

    const toolCount = servers.reduce((sum, s) => sum + s.tools.length, 0);
    return { running: true, servers, toolCount };
  } catch {
    return { running: false, servers: [], toolCount: 0 };
  }
}

// Get all tools in Ollama-compatible format
export async function getBridgeTools(): Promise<OllamaTool[]> {
  try {
    const res = await fetch(`${BRIDGE_URL}/tools`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as BridgeToolsResponse;
    const tools = data.tools || [];

    // Convert to Ollama-compatible format
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema || {
          type: "object",
          properties: {},
        },
      },
    }));
  } catch {
    return [];
  }
}

// Execute a tool via the bridge
export async function executeToolViaBridge(
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const res = await fetch(`${BRIDGE_URL}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName, args }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      return JSON.stringify({ error: `Bridge error: ${res.status}` });
    }
    return await res.text();
  } catch (err: unknown) {
    return JSON.stringify({ error: (err as Error).message });
  }
}
