import { MCPServer, MCPTool, OllamaTool } from "./types";

const BRIDGE_URL = "http://127.0.0.1:3100";

interface BridgeHealth {
  status: string;
  servers: { [name: string]: string };
}

interface BridgeToolOpenAI {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Check if bridge is running
export async function getBridgeStatus(): Promise<{
  running: boolean;
  servers: MCPServer[];
  toolCount: number;
}> {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error("Bridge not responding");
    const health: BridgeHealth = await res.json();

    const servers: MCPServer[] = Object.entries(health.servers).map(
      ([name, status]) => ({
        name,
        config: { command: "" },
        tools: [],
        process: null,
        connected: status === "connected",
        id: 0,
      }),
    );

    // Get tools count
    const toolsRes = await fetch(`${BRIDGE_URL}/tools`, {
      signal: AbortSignal.timeout(3000),
    });
    const toolsData = await toolsRes.json();
    const toolList = toolsData.tools || toolsData;

    // Map tools back to servers
    for (const tool of toolList) {
      const serverName =
        tool.server ||
        (tool.name?.includes("__") ? tool.name.split("__")[0] : "unknown");
      const server = servers.find((s) => s.name === serverName);
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
    const res = await fetch(`${BRIDGE_URL}/tools/openai`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const tools: BridgeToolOpenAI[] = await res.json();
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters || { type: "object", properties: {} },
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
      body: JSON.stringify({ name: toolName, arguments: args }),
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
