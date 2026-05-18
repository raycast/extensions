#!/usr/bin/env node
/**
 * MCP Bridge Server
 * Runs outside Raycast sandbox, connects to MCP servers, exposes REST API
 */

const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 3456;
const CONFIG_PATH = path.join(
  process.env.HOME,
  "Library/Application Support/memu-bot/mcp-config.json"
);

// MCP Server class
class MCPServer {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.process = null;
    this.tools = [];
    this.connected = false;
    this.id = 0;
    this._handlers = [];
    this._stdoutBuffer = "";
  }

  async connect() {
    // Skip broken configs
    if (!this.config.command || (this.config.command === "npx" && (!this.config.args || this.config.args.length === 0))) {
      console.log(`[skip] ${this.name}: no valid command`);
      return;
    }

    return new Promise((resolve) => {
      const env = { ...process.env, ...this.config.env };
      this.process = spawn(this.config.command, this.config.args || [], {
        stdio: ["pipe", "pipe", "pipe"],
        env,
      });

      this.process.stdout.on("data", (data) => {
        this._stdoutBuffer += data.toString();
        const lines = this._stdoutBuffer.split("\n");
        this._stdoutBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          for (const handler of this._handlers) {
            handler(line);
          }
        }
      });

      let stderr = "";
      this.process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      this.process.on("error", (err) => {
        console.error(`[error] ${this.name}:`, err.message);
        this.connected = false;
        resolve();
      });

      this.process.on("exit", (code) => {
        console.log(`[exit] ${this.name}: code ${code}`);
        if (stderr) console.log(`[stderr] ${this.name}:`, stderr.slice(0, 200));
        this.connected = false;
      });

      // Wait for first output, then initialize
      this._waitForOutput(15000)
        .then(() => this._initialize())
        .then(() => resolve())
        .catch((err) => {
          console.error(`[fail] ${this.name}:`, err.message);
          this.connected = false;
          resolve();
        });
    });
  }

  _waitForOutput(timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`No output within ${timeoutMs}ms`));
      }, timeoutMs);

      const onData = () => {
        clearTimeout(timeout);
        this.process.stdout.off("data", onData);
        setTimeout(resolve, 300);
      };

      this.process.stdout.on("data", onData);
    });
  }

  async _initialize() {
    // Initialize
    await this._sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "raycast-ollama-bridge", version: "1.0.0" },
    });

    // Send initialized notification
    this._sendNotification("notifications/initialized");

    // Get tools
    const result = await this._sendRequest("tools/list");
    this.tools = result?.tools || [];
    this.connected = true;

    console.log(`[ok] ${this.name}: ${this.tools.length} tools - ${this.tools.map(t => t.name).join(", ")}`);
  }

  _sendRequest(method, params, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const msg = JSON.stringify({
        jsonrpc: "2.0",
        method,
        ...(params !== undefined && { params }),
        id,
      });

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: ${method} from ${this.name}`));
      }, timeoutMs);

      const handler = (line) => {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === id) {
            clearTimeout(timeout);
            this._handlers = this._handlers.filter((h) => h !== handler);
            if (parsed.error) {
              reject(new Error(`MCP error: ${parsed.error.message}`));
            } else {
              resolve(parsed.result);
            }
          }
        } catch {}
      };

      this._handlers.push(handler);
      this.process.stdin.write(msg + "\n");
    });
  }

  _sendNotification(method, params) {
    const msg = JSON.stringify({
      jsonrpc: "2.0",
      method,
      ...(params !== undefined && { params }),
    });
    this.process.stdin.write(msg + "\n");
  }

  async callTool(name, args) {
    if (!this.connected) {
      return { error: `Server ${this.name} not connected` };
    }
    try {
      const result = await this._sendRequest("tools/call", { name, arguments: args }, 60000);
      return result;
    } catch (err) {
      return { error: err.message };
    }
  }

  disconnect() {
    if (this.process) {
      this.process.stdin.end();
      this.process.kill();
    }
    this.connected = false;
  }
}

// Main
async function main() {
  console.log("MCP Bridge Server starting...");
  console.log(`Config: ${CONFIG_PATH}`);

  // Load config
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch (err) {
    console.error("Failed to read config:", err.message);
    process.exit(1);
  }

  // Connect to all servers
  const servers = new Map();
  for (const [name, serverConfig] of Object.entries(config)) {
    const server = new MCPServer(name, serverConfig);
    await server.connect();
    servers.set(name, server);
  }

  // Collect all tools
  const allTools = [];
  for (const [name, server] of servers) {
    if (!server.connected) continue;
    for (const tool of server.tools) {
      allTools.push({
        ...tool,
        _server: name,
      });
    }
  }

  console.log(`\nTotal: ${allTools.length} tools from ${[...servers.values()].filter(s => s.connected).length} servers`);

  // HTTP server
  const httpServer = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    // GET /status - server status
    if (url.pathname === "/status" && req.method === "GET") {
      const status = {};
      for (const [name, server] of servers) {
        status[name] = {
          connected: server.connected,
          tools: server.tools.map((t) => t.name),
        };
      }
      res.writeHead(200);
      res.end(JSON.stringify(status));
      return;
    }

    // GET /tools - list all tools
    if (url.pathname === "/tools" && req.method === "GET") {
      const tools = allTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        server: t._server,
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ tools }));
      return;
    }

    // POST /call - execute a tool
    if (url.pathname === "/call" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      try {
        const { toolName, args } = JSON.parse(body);
        const tool = allTools.find((t) => t.name === toolName);
        if (!tool) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: `Tool not found: ${toolName}` }));
          return;
        }
        const server = servers.get(tool._server);
        const result = await server.callTool(toolName, args || {});
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.listen(PORT, "127.0.0.1", () => {
    console.log(`\nBridge server running at http://127.0.0.1:${PORT}`);
    console.log("Endpoints:");
    console.log("  GET  /status  - server status");
    console.log("  GET  /tools   - list all tools");
    console.log("  POST /call    - execute tool {toolName, args}");
  });

  // Cleanup on exit
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    for (const server of servers.values()) server.disconnect();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    for (const server of servers.values()) server.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
