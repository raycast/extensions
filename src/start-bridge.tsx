import { Action, ActionPanel, Detail, getPreferenceValues, open } from "@raycast/api";
import { getBridgeStatus } from "./mcp-bridge-client";

interface Preferences {
  mcpConfigPath: string;
}

export default function StartBridge() {
  const { mcpConfigPath } = getPreferenceValues<Preferences>();
  const configPath = mcpConfigPath.replace(/^~/, process.env.HOME || "/Users");

  const bridgeCmd = `cd "$(dirname "$0")" && node mcp-bridge.js --config "${configPath}"`;

  const markdown = `# 🔧 MCP Bridge Server

The MCP Bridge runs **outside** the Raycast sandbox to connect to MCP servers.

## How to Start

Run this in your terminal:

\`\`\`bash
${bridgeCmd}
\`\`\`

Or navigate to the extension directory and run:

\`\`\`bash
cd ~/.cola/outputs/raycast-ollama
node mcp-bridge.js --config "${configPath}"
\`\`\`

## Status

TODO: Bridge status check will appear here.

## Why a separate process?

Raycast extensions run in a sandbox that blocks \`child_process.spawn\`.
The bridge runs as a standalone Node.js process and communicates via HTTP (port 3456).

## Config File

The bridge reads MCP server configs from:

\`${configPath}\`

Example config:

\`\`\`json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  }
}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Bridge Command" content={bridgeCmd} />
          <Action.OpenInBrowser title="MCP Documentation" url="https://modelcontextprotocol.io" />
        </ActionPanel>
      }
    />
  );
}
