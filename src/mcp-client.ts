import { spawn } from "child_process";
import { MCPServerConfig, MCPServer, MCPTool, OllamaTool } from "./types";
import * as fs from "fs";

const JSONRPC_VERSION = "2.0";

export function loadMCPConfig(path: string): Record<string, MCPServerConfig> {
  try {
    const raw = fs.readFileSync(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function jsonrpcMessage(method: string, params?: unknown, id?: number) {
  return JSON.stringify({
    jsonrpc: JSONRPC_VERSION,
    method,
    ...(params !== undefined && { params }),
    ...(id !== undefined && { id }),
  });
}

function sendMessage(server: MCPServer, message: string): void {
  if (!server.process?.stdin)
    throw new Error(`Server ${server.name} has no stdin`);
  server.process.stdin.write(message + "\n");
}

function sendRequest(
  server: MCPServer,
  method: string,
  params?: unknown,
  timeoutMs = 30000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++server.id;
    const message = jsonrpcMessage(method, params, id);

    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${method} from ${server.name}`));
    }, timeoutMs);

    const handler = (line: string) => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.id === id) {
          clearTimeout(timeout);
          server._handlers = (server._handlers || []).filter(
            (h) => h !== handler,
          );
          if (parsed.error) {
            reject(
              new Error(
                `MCP error from ${server.name}: ${parsed.error.message}`,
              ),
            );
          } else {
            resolve(parsed.result);
          }
        }
      } catch {
        /* not JSON */
      }
    };

    server._handlers = server._handlers || [];
    server._handlers.push(handler);
    sendMessage(server, message);
  });
}

// Wait for the process to produce any stdout output (meaning it's ready)
function waitForOutput(server: MCPServer, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Server ${server.name} produced no output within ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    const onData = () => {
      clearTimeout(timeout);
      server.process?.stdout?.off("data", onData);
      // Small additional delay to let the process fully initialize
      setTimeout(resolve, 200);
    };

    server.process?.stdout?.on("data", onData);
  });
}

export async function connectServer(
  name: string,
  config: MCPServerConfig,
): Promise<MCPServer> {
  // Skip servers with no command or obviously broken configs
  if (
    !config.command ||
    (config.command === "npx" && (!config.args || config.args.length === 0))
  ) {
    console.log(`Skipping MCP server ${name}: no valid command`);
    return {
      name,
      config,
      tools: [],
      process: null,
      connected: false,
      id: 0,
    };
  }

  const server: MCPServer = {
    name,
    config,
    tools: [],
    process: null,
    connected: false,
    id: 0,
  };

  return new Promise((resolve) => {
    const env = { ...process.env, ...config.env };
    const proc = spawn(config.command, config.args || [], {
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });

    server.process = proc;
    server._handlers = [];

    // Set up stdout handler IMMEDIATELY
    let stdoutBuffer = "";
    proc.stdout?.on("data", (data: Buffer) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        for (const handler of server._handlers || []) {
          handler(line);
        }
      }
    });

    let stderrBuffer = "";
    proc.stderr?.on("data", (data: Buffer) => {
      stderrBuffer += data.toString();
    });

    proc.on("error", (err) => {
      console.error(`MCP ${name} spawn error:`, err.message);
      server.connected = false;
      resolve(server);
    });

    proc.on("exit", () => {
      if (stderrBuffer)
        console.log(`${name} stderr:`, stderrBuffer.slice(0, 300));
      server.connected = false;
    });

    // Wait for the process to be ready, then initialize
    waitForOutput(server, 15000)
      .then(async () => {
        try {
          await sendRequest(server, "initialize", {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "raycast-ollama", version: "1.0.0" },
          });

          sendMessage(server, jsonrpcMessage("notifications/initialized"));

          const result = await sendRequest(server, "tools/list");
          server.tools = (result as { tools: MCPTool[] })?.tools || [];
          server.connected = true;

          console.log(`MCP ${name}: ${server.tools.length} tools`);
          resolve(server);
        } catch (err) {
          console.error(`MCP ${name} init failed:`, err);
          server.connected = false;
          resolve(server);
        }
      })
      .catch((err) => {
        console.error(`MCP ${name} startup failed:`, err.message);
        server.connected = false;
        resolve(server);
      });
  });
}

export function disconnectServer(server: MCPServer): void {
  if (server.process) {
    server.process.stdin?.end();
    server.process.kill();
    server.process = null;
  }
  server.connected = false;
}

export async function executeTool(
  servers: MCPServer[],
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const server = servers.find(
    (s) => s.connected && s.tools.some((t) => t.name === toolName),
  );
  if (!server) {
    return JSON.stringify({
      error: `No MCP server found for tool: ${toolName}`,
    });
  }

  try {
    const result = await sendRequest(server, "tools/call", {
      name: toolName,
      arguments: args,
    });
    return JSON.stringify(result);
  } catch (err: unknown) {
    return JSON.stringify({ error: (err as Error).message });
  }
}

export function mcpToolsToOllama(servers: MCPServer[]): OllamaTool[] {
  const tools: OllamaTool[] = [];
  for (const server of servers) {
    if (!server.connected) continue;
    for (const tool of server.tools) {
      tools.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || `Tool from ${server.name}`,
          parameters: tool.inputSchema || { type: "object", properties: {} },
        },
      });
    }
  }
  return tools;
}

export function getServersSummary(servers: MCPServer[]): string {
  return servers
    .map((s) => {
      const status = s.connected ? "✅" : "❌";
      const tools = s.tools.map((t) => t.name).join(", ");
      return `${status} ${s.name}: ${tools || "no tools"}`;
    })
    .join("\n");
}
