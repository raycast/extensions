// Native Messaging uses length-prefixed JSON; Local clients use one JSON line per connection.
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const directory = path.join(os.homedir(), ".zen-browser-bridge");
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
fs.chmodSync(directory, 0o700);
const socketPath = path.join(
  directory,
  `${process.pid}-${crypto.randomUUID().slice(0, 8)}.sock`,
);
const pending = new Map();
const { enrichTabs } = require("./titles.cjs");
const MAX = 1024 * 1024;
const server = net.createServer((socket) => {
  let input = "";
  socket.setEncoding("utf8");
  socket.setTimeout(8000, () => socket.destroy());
  socket.on("error", () => {});
  socket.on("data", (chunk) => {
    input += chunk;
    if (input.length > MAX) return socket.destroy();
    if (!input.includes("\n")) return;
    socket.removeAllListeners("data");
    try {
      const request = JSON.parse(input.split("\n")[0]);
      if (!["list", "activate"].includes(request.method))
        throw new Error("Unknown command");
      const id = crypto.randomUUID();
      pending.set(id, socket);
      socket.on("close", () => pending.delete(id));
      const message = Buffer.from(JSON.stringify({ ...request, id }));
      const header = Buffer.alloc(4);
      header.writeUInt32LE(message.length);
      process.stdout.write(Buffer.concat([header, message]));
    } catch {
      socket.end(JSON.stringify({ error: "Invalid bridge request" }) + "\n");
    }
  });
});
let buffer = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const length = buffer.readUInt32LE(0);
    if (length > MAX) return shutdown();
    if (buffer.length < length + 4) return;
    let response;
    try {
      response = JSON.parse(buffer.subarray(4, length + 4).toString());
    } catch {
      return shutdown();
    }
    buffer = buffer.subarray(length + 4);
    const socket = pending.get(response.id);
    if (socket) {
      if (Array.isArray(response.result))
        response.result = enrichTabs(response.result);
      socket.end(JSON.stringify(response) + "\n");
    }
    pending.delete(response.id);
  }
});
function shutdown() {
  for (const socket of pending.values()) socket.destroy();
  server.close();
  try {
    fs.unlinkSync(socketPath);
  } catch {}
  process.exit(0);
}
process.stdin.on("end", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.stdout.on("error", shutdown);
server.on("error", shutdown);
server.listen(socketPath, () => fs.chmodSync(socketPath, 0o600));
