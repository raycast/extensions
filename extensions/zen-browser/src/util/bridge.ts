import { promises as fs } from "fs";
import net from "net";
import os from "os";
import path from "path";
import { PinnedTabEntry } from "./pinned-tabs";

const directory = path.join(os.homedir(), ".zen-browser-bridge");
const unavailable = "Open Zen and install the Zen Browser Bridge companion. See the extension README.";

export function bridgeRequest<T>(socketPath: string, request: object): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let input = "";
    let received = false;
    socket.setEncoding("utf8");
    socket.setTimeout(7000, () => socket.destroy(new Error("Zen bridge timed out. Try again.")));
    socket.on("connect", () => socket.write(JSON.stringify(request) + "\n"));
    socket.on("error", reject);
    socket.on("end", () => {
      if (!received) reject(new Error("Zen bridge disconnected."));
    });
    socket.on("data", (chunk) => {
      input += chunk;
      if (input.length > 1024 * 1024) return socket.destroy(new Error("Bridge response too large."));
      if (!input.includes("\n")) return;
      received = true;
      try {
        const response = JSON.parse(input.split("\n")[0]);
        if (response.error) reject(new Error(response.error));
        else resolve(response.result as T);
      } catch (error) {
        reject(error);
      } finally {
        socket.destroy();
      }
    });
  });
}

export async function readBridgeTabs(): Promise<PinnedTabEntry[]> {
  if (process.platform !== "darwin") throw new Error("The pinned-tab bridge currently supports macOS only.");
  const files = await fs.readdir(directory).catch(() => [] as string[]);
  const results = await Promise.allSettled(
    files
      .filter((file) => file.endsWith(".sock"))
      .map(async (file) => {
        const bridge = path.join(directory, file);
        const tabs = await bridgeRequest<PinnedTabEntry[]>(bridge, { method: "list", pinned: true });
        return tabs.map((tab) => ({ ...tab, bridge }));
      }),
  );
  const connected = results.filter((result) => result.status === "fulfilled");
  if (!connected.length) throw new Error(unavailable);
  return connected.flatMap((result) => result.value);
}
