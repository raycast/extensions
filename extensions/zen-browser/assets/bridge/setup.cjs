// Installs only the reviewed sources bundled with this Raycast extension.
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const NAME = "zen_browser_bridge";
const ID = "zen-browser-bridge@sandzhaj";
const quote = (text) => "'" + text.replaceAll("'", "'\\''") + "'";

async function configure(action, supportPath, home = os.homedir(), node = process.execPath) {
  const directory = path.join(supportPath, "zen-browser-bridge");
  const launcher = path.join(directory, "launch");
  const manifestPath = path.join(home, "Library/Application Support/Mozilla/NativeMessagingHosts", NAME + ".json");
  let existing;
  try {
    existing = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (action === "remove") {
    // Never unregister a helper installed by another client or standalone installer.
    if (existing && existing.path !== launcher)
      throw Error("This connection is managed by another installation. It was not removed.");
    await fs.rm(manifestPath, { force: true });
    await fs.rm(directory, { recursive: true, force: true });
    return;
  }
  if (action !== "install") throw Error("Unknown setup action.");
  if (
    existing &&
    (existing.name !== NAME || existing.allowed_extensions?.length !== 1 || existing.allowed_extensions[0] !== ID)
  ) {
    throw Error("An unrelated native host registration already exists. It was not changed.");
  }
  // Verify the exact runtime that Zen will launch. Do not depend on the browser's PATH.
  const version = execFileSync(node, ["--version"], { encoding: "utf8", timeout: 5000 }).trim();
  if (!/^v\d+\./.test(version) || Number(version.slice(1).split(".")[0]) < 22)
    throw Error("Node.js 22 or newer is required. Update Raycast and try again.");
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.chmod(directory, 0o700);
  for (const file of ["host.cjs", "titles.cjs", "LICENSE"]) {
    await fs.copyFile(path.join(__dirname, file), path.join(directory, file));
  }
  await fs.writeFile(launcher, `#!/bin/sh\nexec ${quote(node)} ${quote(path.join(directory, "host.cjs"))}\n`, {
    mode: 0o700,
  });
  await fs.chmod(launcher, 0o700);
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const temporary = manifestPath + "." + process.pid + ".tmp";
  await fs.writeFile(
    temporary,
    JSON.stringify(
      { name: NAME, description: "Zen Browser Bridge", path: launcher, type: "stdio", allowed_extensions: [ID] },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  await fs.rename(temporary, manifestPath);
}

module.exports = { configure };
if (require.main === module) {
  if (process.platform !== "darwin") {
    console.error("Bridge setup supports macOS only.");
    process.exit(1);
  }
  const [action, supportPath] = process.argv.slice(2);
  if (!path.isAbsolute(supportPath || "")) {
    console.error("An absolute support directory is required.");
    process.exit(1);
  }
  configure(action, supportPath).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
