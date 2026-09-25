import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const output = mkdtempSync(path.join(tmpdir(), "zenmux-model-provider-"));

try {
  execFileSync(
    process.execPath,
    [require.resolve("typescript/bin/tsc"), "-p", "scripts/tsconfig.model-provider.json", "--outDir", output],
    { cwd: root, stdio: "inherit" },
  );
  execFileSync(process.execPath, ["--test", path.join(output, "scripts/zenmux-chat.test.js")], {
    cwd: root,
    stdio: "inherit",
  });
} catch (error) {
  process.exitCode = Number.isInteger(error.status) ? error.status : 1;
} finally {
  rmSync(output, { recursive: true, force: true });
}
