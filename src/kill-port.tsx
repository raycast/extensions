import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { promisify } from "util";

const execAsync = promisify(exec);

type PortProcess = {
  port: string;
  process: string;
  pid: string;
  command: string;
};

const DEV_PROCESSES = ["node", "bun", "deno", "python", "python3", "ruby", "php", "java", "vite", "next", "astro"];

const IGNORED_COMMANDS = [
  "raycast backend",
  "raycast",
  "logi",
  "logitech",
  "figma",
  "rapportd",
  "ollama",
  "antigravity",
  "linear",
];

async function getFullCommand(pid: string) {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o command=`);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function getListeningPorts(): Promise<PortProcess[]> {
  const { stdout } = await execAsync(`lsof -nP -iTCP -sTCP:LISTEN | awk 'NR>1 {print $1 "|" $2 "|" $9}'`);

  if (!stdout.trim()) {
    return [];
  }

  const unique = new Map<string, PortProcess>();

  for (const line of stdout.trim().split("\n")) {
    const [process, pid, address] = line.split("|");
    const port = address?.split(":").pop();

    if (!process || !pid || !port) {
      continue;
    }

    const processName = process.toLowerCase();

    const isDevProcess = DEV_PROCESSES.some((name) => processName === name || processName.startsWith(name));

    if (!isDevProcess) {
      continue;
    }

    const fullCommand = await getFullCommand(pid);
    const normalizedCommand = fullCommand.toLowerCase();

    const shouldIgnore = IGNORED_COMMANDS.some((ignored) => normalizedCommand.includes(ignored));

    if (shouldIgnore) {
      continue;
    }

    unique.set(`${port}-${pid}`, {
      port,
      process,
      pid,
      command: fullCommand,
    });
  }

  return Array.from(unique.values()).sort((a, b) => Number(a.port) - Number(b.port));
}

async function killProcess(pid: string, port: string) {
  try {
    await execAsync(`kill ${pid}`);

    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      await execAsync(`kill -0 ${pid}`);
      await execAsync(`kill -9 ${pid}`);
    } catch {
      // The process is already stopped.
    }

    await showToast({
      style: Toast.Style.Success,
      title: `Port ${port} freed`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Unable to free port ${port}`,
      message: String(error),
    });
  }
}

export default function Command() {
  const [ports, setPorts] = useState<PortProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);

    try {
      const result = await getListeningPorts();
      setPorts(result);
    } catch (error) {
      setPorts([]);

      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to retrieve ports",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for a port or process...">
      {!isLoading && ports.length === 0 ? (
        <List.EmptyView icon={Icon.CheckCircle} title="No development ports are currently listening" />
      ) : (
        ports.map((item) => (
          <List.Item
            key={`${item.port}-${item.pid}`}
            icon={Icon.Terminal}
            title={`Port ${item.port}`}
            subtitle={item.process}
            accessories={[{ text: `PID ${item.pid}` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.XMarkCircle}
                  title={`Kill Port ${item.port}`}
                  onAction={async () => {
                    await killProcess(item.pid, item.port);
                    await refresh();
                  }}
                />

                <Action.CopyToClipboard title="Copy Command" content={item.command} />

                <Action.CopyToClipboard title="Copy PID" content={item.pid} />

                <Action
                  icon={Icon.ArrowClockwise}
                  title="Refresh"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
