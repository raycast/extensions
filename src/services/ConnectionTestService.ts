import { spawn } from "child_process";
import {
  MCPServerConfig,
  ConnectionTestResult,
  StdioTransportConfig,
  SSETransportConfig,
  HTTPTransportConfig,
} from "../types/mcpServer";

export class ConnectionTestService {
  private readonly DEFAULT_TIMEOUT = 10000;
  private readonly SSE_TIMEOUT = 5000;
  private readonly HTTP_TIMEOUT = 5000;

  async testConnection(config: MCPServerConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      switch (config.transport) {
        case "stdio":
          return await this.testStdioConnection(config as StdioTransportConfig);
        case "sse":
          return await this.testSSEConnection(config as SSETransportConfig);
        case "/sse":
          return await this.testWindsurfSSEConnection(
            config as { serverUrl: string; headers?: Record<string, string> },
          );
        case "http":
          return await this.testHTTPConnection(config as HTTPTransportConfig);
        default:
          throw new Error(
            `Unsupported transport type: ${(config as { transport: string }).transport}`,
          );
      }
    } catch (error) {
      return {
        success: false,
        message: "Connection test failed",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  private async testStdioConnection(
    config: StdioTransportConfig,
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      try {
        if (!config.command) {
          resolve({
            success: false,
            message: "No command specified",
            error: "Command is required for stdio transport",
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          });
          return;
        }

        const env = {
          ...process.env,
          ...config.env,
        };

        let fullCommand = config.command;
        if (config.args && config.args.length > 0) {
          fullCommand += " " + config.args.join(" ");
        }

        const isWindows = process.platform === "win32";
        const shell = isWindows ? "cmd" : "/bin/sh";
        const shellFlag = isWindows ? "/c" : "-c";
        const child = spawn(shell, [shellFlag, fullCommand], {
          env,
          stdio: ["pipe", "pipe", "pipe"],
          timeout: this.DEFAULT_TIMEOUT,
        });

        let processStarted = false;

        child.on("spawn", () => {
          processStarted = true;

          try {
            child.stdin.write(
              '{"jsonrpc": "2.0", "method": "initialize", "id": 1, "params": {}}\n',
            );
            child.stdin.end();
          } catch (error) {
            console.warn("Could not write to process stdin:", error);
          }

          setTimeout(() => {
            if (!child.killed) {
              child.kill("SIGTERM");
            }
            resolve({
              success: true,
              message: "Process started successfully",
              responseTime: Date.now() - startTime,
              timestamp: new Date(),
            });
          }, 1000);
        });

        child.on("error", (error) => {
          resolve({
            success: false,
            message: "Failed to start process",
            error: error.message,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          });
        });

        child.on("exit", (code, signal) => {
          if (!processStarted) {
            resolve({
              success: false,
              message: "Process exited immediately",
              error: `Process exited with code ${code} and signal ${signal}`,
              responseTime: Date.now() - startTime,
              timestamp: new Date(),
            });
          }
        });

        setTimeout(() => {
          if (!processStarted) {
            child.kill("SIGTERM");
            resolve({
              success: false,
              message: "Connection test timed out",
              error: "Process did not start within timeout period",
              responseTime: Date.now() - startTime,
              timestamp: new Date(),
            });
          }
        }, this.DEFAULT_TIMEOUT);
      } catch (error) {
        resolve({
          success: false,
          message: "Failed to test stdio connection",
          error: error instanceof Error ? error.message : "Unknown error",
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
    });
  }

  private async testSSEConnection(
    config: SSETransportConfig,
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      if (!config.url) {
        return {
          success: false,
          message: "No URL specified",
          error: "URL is required for SSE transport",
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      try {
        new URL(config.url);
      } catch {
        return {
          success: false,
          message: "Invalid URL format",
          error: "The provided URL is not valid",
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.SSE_TIMEOUT);

      try {
        const response = await fetch(config.url, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
            ...config.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("text/event-stream")) {
            return {
              success: true,
              message: "SSE endpoint is reachable",
              responseTime: Date.now() - startTime,
              timestamp: new Date(),
            };
          } else {
            return {
              success: false,
              message: "Endpoint is reachable but not serving SSE",
              error: `Expected 'text/event-stream' but got '${contentType}'`,
              responseTime: Date.now() - startTime,
              timestamp: new Date(),
            };
          }
        } else {
          return {
            success: false,
            message: `Server responded with ${response.status}`,
            error: `HTTP ${response.status}: ${response.statusText}`,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        }
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          return {
            success: false,
            message: "Connection timed out",
            error: "Request timed out after 5 seconds",
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        }

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to test SSE connection",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  private async testWindsurfSSEConnection(config: {
    serverUrl: string;
    headers?: Record<string, string>;
  }): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      if (!config.serverUrl) {
        return {
          success: false,
          message: "No server URL specified",
          error: "Server URL is required for Windsurf SSE transport",
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      try {
        new URL(config.serverUrl);
      } catch {
        return {
          success: false,
          message: "Invalid server URL format",
          error: "The provided server URL is not valid",
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.SSE_TIMEOUT);

      try {
        const response = await fetch(config.serverUrl, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
            ...config.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("text/event-stream")) {
            return {
              success: true,
              message: "Windsurf SSE endpoint is reachable",
              responseTime: Date.now() - startTime,
              timestamp: new Date(),
            };
          } else {
            return {
              success: false,
              message: "Endpoint is reachable but not serving SSE",
              error: `Expected 'text/event-stream' but got '${contentType}'`,
              responseTime: Date.now() - startTime,
              timestamp: new Date(),
            };
          }
        } else {
          return {
            success: false,
            message: `Server responded with ${response.status}`,
            error: `HTTP ${response.status}: ${response.statusText}`,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        }
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          return {
            success: false,
            message: "Connection timed out",
            error: "Request timed out after 5 seconds",
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        }

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to test Windsurf SSE connection",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  private async testHTTPConnection(
    config: HTTPTransportConfig,
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      if (!config.url) {
        return {
          success: false,
          message: "No URL specified",
          error: "URL is required for HTTP transport",
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      try {
        new URL(config.url);
      } catch {
        return {
          success: false,
          message: "Invalid URL format",
          error: "The provided URL is not valid",
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HTTP_TIMEOUT);

      try {
        const response = await fetch(config.url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...config.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return {
            success: true,
            message: "HTTP endpoint is reachable",
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        } else if (response.status === 404) {
          return {
            success: true,
            message: "HTTP server is reachable (404 is expected for base URLs)",
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        } else if (response.status === 405) {
          return {
            success: true,
            message:
              "HTTP server is reachable (GET method not allowed, but server responds)",
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        } else {
          return {
            success: false,
            message: `Server responded with ${response.status}`,
            error: `HTTP ${response.status}: ${response.statusText}`,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        }
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          return {
            success: false,
            message: "Connection timed out",
            error: "Request timed out after 5 seconds",
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        }

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to test HTTP connection",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  getTestDescription(config: MCPServerConfig): string {
    switch (config.transport) {
      case "stdio": {
        const stdioConfig = config as StdioTransportConfig;
        let fullCommand = stdioConfig.command;
        if (stdioConfig.args && stdioConfig.args.length > 0) {
          fullCommand += " " + stdioConfig.args.join(" ");
        }
        return `Run via shell: ${fullCommand}`;
      }
      case "sse": {
        const sseConfig = config as SSETransportConfig;
        return `Connect to SSE endpoint: ${sseConfig.url}`;
      }
      case "/sse": {
        const windsurfSSEConfig = config as { serverUrl: string };
        return `Connect to Windsurf SSE endpoint: ${windsurfSSEConfig.serverUrl}`;
      }
      case "http": {
        const httpConfig = config as HTTPTransportConfig;
        return `Test HTTP endpoint: ${httpConfig.url}`;
      }
      default:
        return "Unknown transport type";
    }
  }
}
