import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ─── Shared shell helper ───────────────────────────────────────────────────────
// Resolve common tool paths on macOS so Raycast can find user-installed CLIs.
const SHELL_ENV = {
  ...process.env,
  PATH: [
    "/opt/homebrew/bin", // Apple Silicon Homebrew
    "/usr/local/bin", // Intel Homebrew
    "/opt/homebrew/sbin",
    "/usr/local/sbin",
    `${homedir()}/.cargo/bin`,
    `${homedir()}/.local/bin`,
    `${homedir()}/.npm-global/bin`,
    `${homedir()}/bin`,
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    process.env.PATH ?? "",
  ].join(":"),
  FORCE_COLOR: "0",
};

async function run(cmd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/bin/zsh", ["-lc", cmd], {
      env: SHELL_ENV,
    });
    return stdout.trim();
  } catch (err: any) {
    const stdout = err && err.stdout ? String(err.stdout).trim() : "";
    const stderr = err && err.stderr ? String(err.stderr).trim() : "";
    const message = err?.message ?? String(err);
    throw new Error(
      `${message}${stderr ? "\nSTDERR: " + stderr : ""}${stdout ? "\nSTDOUT: " + stdout : ""}`,
    );
  }
}

function quoteShellArg(value: string): string {
  return "'" + value.replaceAll("'", "'\"'\"'") + "'";
}

function getPackageUrl(
  ecosystem: string,
  name: string,
  subtype?: string,
): string | undefined {
  try {
    const safeName = encodeURIComponent(name);
    switch (ecosystem) {
      case "brew":
        if (subtype === "cask")
          return `https://formulae.brew.sh/cask/${safeName}`;
        return `https://formulae.brew.sh/formula/${safeName}`;
      case "npm":
      case "yarn":
      case "pnpm":
        return `https://www.npmjs.com/package/${safeName}`;
      case "pip":
      case "pipx":
        return `https://pypi.org/project/${safeName}/`;
      case "cargo":
        return `https://crates.io/crates/${safeName}`;
      case "gem":
        return `https://rubygems.org/gems/${safeName}`;
      case "go":
        return `https://pkg.go.dev/${name}`;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

function getChangelogUrl(ecosystem: string, name: string): string | undefined {
  try {
    const safeName = encodeURIComponent(name);
    switch (ecosystem) {
      case "npm":
      case "yarn":
      case "pnpm":
        return `https://www.npmjs.com/package/${safeName}#readme`;
      case "pip":
      case "pipx":
        return `https://pypi.org/project/${safeName}/#history`;
      case "cargo":
        return `https://crates.io/crates/${safeName}`;
      case "gem":
        return `https://rubygems.org/gems/${safeName}`;
      case "go":
        return `https://github.com/golang/go/wiki/Release-Notes`;
      case "brew":
        return `https://github.com/Homebrew/brew/releases`;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EcosystemId =
  | "brew"
  | "npm"
  | "yarn"
  | "pnpm"
  | "pip"
  | "pipx"
  | "cargo"
  | "gem"
  | "mas"
  | "go";

export async function isEcosystemAvailable(id: EcosystemId): Promise<boolean> {
  try {
    switch (id) {
      case "brew":
        await run("command -v brew");
        return true;
      case "npm":
        await run("command -v npm");
        return true;
      case "yarn":
        await run("command -v yarn");
        return true;
      case "pnpm":
        await run("command -v pnpm");
        return true;
      case "pip":
        // resolvePipCmd returns a command string even if pip isn't present; validate it
        try {
          const cmd = await resolvePipCmd();
          await run(`command -v ${cmd.split(" ")[0]}`);
          return true;
        } catch {
          return false;
        }
      case "pipx":
        await run("command -v pipx");
        return true;
      case "cargo":
        await run("command -v cargo");
        return true;
      case "gem":
        await run("command -v gem");
        return true;
      case "mas":
        await run("command -v mas");
        return true;
      case "go":
        await run("command -v go");
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export interface OutdatedPackage {
  name: string;
  current: string;
  latest: string;
  website?: string;
  changelog?: string;
}

export interface EcosystemStatus {
  id: EcosystemId;
  name: string;
  enabled: boolean;
  packages: OutdatedPackage[];
  error?: string;
  /** true while still loading */
  loading?: boolean;
}

// ─── Homebrew ─────────────────────────────────────────────────────────────────

export async function checkBrew(): Promise<OutdatedPackage[]> {
  const raw = await run("brew outdated --json=v2");
  const json = JSON.parse(raw);

  const formulae: OutdatedPackage[] = (json?.formulae ?? []).map((f: any) => ({
    name: f.name,
    current: f.installed_versions?.[0] ?? "?",
    latest: f.current_version ?? "?",
    website: getPackageUrl("brew", f.name, "formula"),
    changelog: getChangelogUrl("brew", f.name),
  }));

  const casks: OutdatedPackage[] = (json?.casks ?? []).map((c: any) => ({
    name: c.name,
    current: c.installed_versions ?? "?",
    latest: c.current_version ?? "?",
    website: getPackageUrl("brew", c.name, "cask"),
    changelog: getChangelogUrl("brew", c.name),
  }));

  return [...formulae, ...casks];
}

export async function upgradeBrew(): Promise<string> {
  await run("brew update");
  const out = await run("brew upgrade && brew upgrade --cask");
  return out;
}

// ─── npm (global) ─────────────────────────────────────────────────────────────

export async function checkNpm(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("npm outdated -g --json");
    if (!raw) return [];
    const json = JSON.parse(raw);
    return Object.entries(json).map(([name, info]: [string, any]) => ({
      name,
      current: info.current ?? "?",
      latest: info.latest ?? "?",
      website: getPackageUrl("npm", name),
      changelog: getChangelogUrl("npm", name),
    }));
  } catch (err: any) {
    // npm outdated exits with code 1 when packages are outdated — parse stdout anyway
    const stdout = err?.stdout?.trim() ?? "";
    if (!stdout) return [];
    const json = JSON.parse(stdout);
    return Object.entries(json).map(([name, info]: [string, any]) => ({
      name,
      current: info.current ?? "?",
      latest: info.latest ?? "?",
      website: getPackageUrl("npm", name),
      changelog: getChangelogUrl("npm", name),
    }));
  }
}

export async function upgradeNpm(): Promise<string> {
  return run("npm update -g");
}

// ─── pip ──────────────────────────────────────────────────────────────────────

async function resolvePipCmd(): Promise<string> {
  try {
    await run("command -v pip");
    return "pip";
  } catch {
    try {
      await run("command -v pip3");
      return "pip3";
    } catch {
      return "python3 -m pip";
    }
  }
}

export async function checkPip(): Promise<OutdatedPackage[]> {
  const pipCmd = await resolvePipCmd();
  try {
    const raw = await run(`${pipCmd} list --outdated --format=json`);
    const json: Array<{
      name: string;
      version: string;
      latest_version: string;
    }> = JSON.parse(raw);
    return json.map((p) => ({
      name: p.name,
      current: p.version,
      latest: p.latest_version,
      website: getPackageUrl("pip", p.name),
      changelog: getChangelogUrl("pip", p.name),
    }));
  } catch (err: any) {
    const stdout = err?.stdout?.trim() ?? "";
    if (stdout) {
      try {
        const json = JSON.parse(stdout);
        return json.map((p: any) => ({
          name: p.name,
          current: p.version,
          latest: p.latest_version,
          website: getPackageUrl("pip", p.name),
          changelog: getChangelogUrl("pip", p.name),
        }));
      } catch {
        // fall through to error
      }
    }
    throw new Error(
      "pip not available or failed. Ensure pip/pip3 is installed.",
    );
  }
}

export async function upgradePip(): Promise<string> {
  const pkgs = await checkPip();
  if (pkgs.length === 0) return "All pip packages are up to date.";
  const names = pkgs.map((p) => quoteShellArg(p.name)).join(" ");
  const pipCmd = await resolvePipCmd();
  return run(`${pipCmd} install --upgrade ${names}`);
}

// ─── pipx ─────────────────────────────────────────────────────────────────────

export async function checkPipx(): Promise<OutdatedPackage[]> {
  const raw = await run("pipx list --json");
  const json = JSON.parse(raw);
  const venvs: Record<string, any> = json?.venvs ?? {};

  const results: OutdatedPackage[] = [];
  for (const [name, info] of Object.entries(venvs)) {
    const pkg = info?.metadata?.main_package;
    if (pkg) {
      results.push({
        name,
        current: pkg.package_version ?? "?",
        latest: "run pipx upgrade to check",
        website: getPackageUrl("pip", name),
        changelog: getChangelogUrl("pip", name),
      });
    }
  }
  return results;
}

export async function upgradePipx(): Promise<string> {
  return run("pipx upgrade-all");
}

// ─── cargo (requires cargo-update: `cargo install cargo-update`) ──────────────

export async function checkCargo(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("cargo install-update --list");
    const lines = raw.split("\n").filter((l) => l.includes("Yes"));
    return lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      const name = parts[0] ?? "?";
      return {
        name,
        current: parts[1] ?? "?",
        latest: parts[2] ?? "?",
        website: getPackageUrl("cargo", name),
        changelog: getChangelogUrl("cargo", name),
      };
    });
  } catch {
    throw new Error(
      "cargo-update not installed. Run: cargo install cargo-update",
    );
  }
}

export async function upgradeCargo(): Promise<string> {
  return run("cargo install-update --all");
}

// ─── gem ──────────────────────────────────────────────────────────────────────

export async function checkGem(): Promise<OutdatedPackage[]> {
  const raw = await run("gem outdated");
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      // Format: "name (current < latest)"
      const match = /^(.+?)\s+\((.+?)\s+<\s+(.+?)\)$/.exec(line);
      if (match) {
        return {
          name: match[1],
          current: match[2],
          latest: match[3],
          website: getPackageUrl("gem", match[1]),
          changelog: getChangelogUrl("gem", match[1]),
        };
      }
      return {
        name: line,
        current: "?",
        latest: "?",
        website: getPackageUrl("gem", line),
        changelog: getChangelogUrl("gem", line),
      };
    });
}

export async function upgradeGem(): Promise<string> {
  return run("gem update");
}

// ─── mas (Mac App Store) ──────────────────────────────────────────────────────

export async function checkMas(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("mas outdated");
    if (!raw) return [];
    return raw.split("\n").map((line) => {
      const match = /^(\d+)\s+(.+?)\s+\((.+?)\)$/.exec(line);
      if (match) {
        return { name: match[2], current: "installed", latest: match[3] };
      }
      return { name: line, current: "?", latest: "?" };
    });
  } catch {
    throw new Error("mas not installed. Run: brew install mas");
  }
}

export async function upgradeMas(): Promise<string> {
  return run("mas upgrade");
}

// ─── yarn (global) ────────────────────────────────────────────────────────────

export async function checkYarn(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("yarn global outdated --json");
    if (!raw) return [];
    const lines = raw.split("\n");
    const jsonLine = lines.find((line) => line.startsWith("{"));
    if (!jsonLine) return [];
    const json = JSON.parse(jsonLine);
    return Object.entries(json).map(([name, info]: [string, any]) => ({
      name,
      current: info.current ?? "?",
      latest: info.latest ?? "?",
      website: getPackageUrl("npm", name),
      changelog: getChangelogUrl("npm", name),
    }));
  } catch (err: any) {
    const stdout = err?.stdout?.trim() ?? "";
    if (!stdout) return [];
    try {
      const json = JSON.parse(stdout);
      return Object.entries(json).map(([name, info]: [string, any]) => ({
        name,
        current: info.current ?? "?",
        latest: info.latest ?? "?",
        website: getPackageUrl("npm", name),
        changelog: getChangelogUrl("npm", name),
      }));
    } catch {
      return [];
    }
  }
}

export async function upgradeYarn(): Promise<string> {
  return run("yarn global upgrade");
}

// ─── pnpm (global) ────────────────────────────────────────────────────────────

export async function checkPnpm(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("pnpm outdated -g --json");
    if (!raw) return [];
    const json = JSON.parse(raw);
    return Object.entries(json).map(([name, info]: [string, any]) => ({
      name,
      current: info.current ?? "?",
      latest: info.latest ?? "?",
      website: getPackageUrl("npm", name),
      changelog: getChangelogUrl("npm", name),
    }));
  } catch (err: any) {
    const stdout = err?.stdout?.trim() ?? "";
    if (!stdout) return [];
    const json = JSON.parse(stdout);
    return Object.entries(json).map(([name, info]: [string, any]) => ({
      name,
      current: info.current ?? "?",
      latest: info.latest ?? "?",
      website: getPackageUrl("npm", name),
      changelog: getChangelogUrl("npm", name),
    }));
  }
}

export async function upgradePnpm(): Promise<string> {
  return run("pnpm update -g");
}

// ─── go (global tools) ────────────────────────────────────────────────────────

export async function checkGo(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("go list -m -u -json all 2>/dev/null");
    if (!raw) return [];
    const modules: Array<{
      Path: string;
      Version?: string;
      Update?: { Version: string };
    }> = [];
    const jsonBlocks = raw.match(/\{[^}]*\}/g);
    if (!jsonBlocks) return [];

    for (const block of jsonBlocks) {
      try {
        const parsed = JSON.parse(block);
        if (parsed.Update && parsed.Path && parsed.Version) {
          modules.push(parsed);
        }
      } catch {
        continue;
      }
    }

    return modules.map((mod) => ({
      name: mod.Path,
      current: mod.Version ?? "?",
      latest: mod.Update?.Version ?? "?",
      website: getPackageUrl("go", mod.Path),
      changelog: getChangelogUrl("go", mod.Path),
    }));
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error.includes("go.mod")) {
      return [];
    }
    throw new Error("go not installed. Run: brew install go");
  }
}

export async function upgradeGo(): Promise<string> {
  const outdated = await checkGo();
  if (outdated.length === 0) return "All Go tools are up to date.";
  const updates = outdated.map((pkg) => `${pkg.name}@latest`).join(" ");
  return run(`go install ${updates.split(" ").map(quoteShellArg).join(" ")}`);
}

export async function installPackage(
  ecosystem: EcosystemId,
  packageName: string,
  version?: string,
): Promise<string> {
  const nameArg = quoteShellArg(packageName);
  switch (ecosystem) {
    case "brew":
      return run(`brew install ${nameArg}`);
    case "npm":
      return run(`npm install -g ${version ? `${nameArg}@${quoteShellArg(version)}` : nameArg}`);
    case "yarn":
      return run(`yarn global add ${version ? `${nameArg}@${quoteShellArg(version)}` : nameArg}`);
    case "pnpm":
      return run(`pnpm add -g ${version ? `${nameArg}@${quoteShellArg(version)}` : nameArg}`);
    case "pip": {
      const pipCmd = await resolvePipCmd();
      return run(`${pipCmd} install ${version ? `${nameArg}==${quoteShellArg(version)}` : nameArg}`);
    }
    case "pipx":
      return run(`pipx install ${version ? `${nameArg}==${quoteShellArg(version)}` : nameArg}`);
    case "gem":
      return run(`gem install ${version ? `${nameArg} -v ${quoteShellArg(version)}` : nameArg}`);
    case "cargo":
      return run(`cargo install ${version ? `${nameArg} --version ${quoteShellArg(version)}` : nameArg}`);
    case "go":
      return run(`go install ${quoteShellArg(`${packageName}@${version ?? "latest"}`)}`);
    default:
      throw new Error(`Install not supported for: ${ecosystem}`);
  }
}

export async function listInstalledPackages(
  ecosystem: EcosystemId,
): Promise<OutdatedPackage[]> {
  switch (ecosystem) {
    case "brew": {
      const formulaRaw = await run(
        "brew list --formula --versions 2>/dev/null",
      );
      const caskRaw = await run("brew list --cask --versions 2>/dev/null");
      const lines = (formulaRaw + "\n" + caskRaw).split("\n").filter(Boolean);
      return lines.map((line) => {
        const parts = line.trim().split(/\s+/);
        const name = parts[0];
        const current = parts.slice(1).join(" ") || "?";
        return {
          name,
          current,
          latest: "?",
          website: getPackageUrl("brew", name),
        };
      });
    }
    case "npm":
    case "pnpm":
    case "yarn": {
      try {
        const cmd =
          ecosystem === "npm"
            ? "npm ls -g --depth=0 --json"
            : `${ecosystem} ls -g --depth=0 --json`;
        const raw = await run(cmd);
        if (!raw) return [];
        const json = JSON.parse(raw);
        const deps = json.dependencies ?? {};
        return Object.entries(deps).map(([name, info]: [string, any]) => ({
          name,
          current: info.version ?? "?",
          latest: "?",
          website: getPackageUrl("npm", name),
        }));
      } catch {
        return [];
      }
    }
    case "pip": {
      try {
        const pipCmd = await resolvePipCmd();
        const raw = await run(`${pipCmd} list --format=json`);
        if (!raw) return [];
        const json: Array<{ name: string; version: string }> = JSON.parse(raw);
        return json.map((p) => ({
          name: p.name,
          current: p.version,
          latest: "?",
          website: getPackageUrl("pip", p.name),
        }));
      } catch {
        return [];
      }
    }
    case "pipx": {
      try {
        const raw = await run("pipx list --json");
        const json = JSON.parse(raw);
        const venvs: Record<string, any> = json?.venvs ?? {};
        return Object.entries(venvs).map(([name, info]: [string, any]) => ({
          name,
          current: info?.metadata?.main_package?.package_version ?? "?",
          latest: "?",
          website: getPackageUrl("pip", name),
        }));
      } catch {
        return [];
      }
    }
    case "gem": {
      try {
        const raw = await run("gem list --local");
        if (!raw) return [];
        return raw
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const m = /^(.+?) \((.+?)\)/.exec(line);
            const name = m ? m[1] : line;
            const current = m ? m[2] : "?";
            return {
              name,
              current,
              latest: "?",
              website: getPackageUrl("gem", name),
            };
          });
      } catch {
        return [];
      }
    }
    case "cargo": {
      try {
        const raw = await run("cargo install --list 2>/dev/null");
        if (!raw) return [];
        const lines = raw.split("\n");
        const pkgs: OutdatedPackage[] = [];
        for (const line of lines) {
          const m = /^(.+?) v([0-9.-]+):/.exec(line);
          if (m) {
            pkgs.push({
              name: m[1],
              current: m[2],
              latest: "?",
              website: getPackageUrl("cargo", m[1]),
            });
          }
        }
        return pkgs;
      } catch {
        return [];
      }
    }
    case "go": {
      try {
        const gopath = await run("go env GOPATH 2>/dev/null");
        const binDir = gopath ? `${gopath}/bin` : "$(go env GOPATH)/bin";
        const raw = await run(
          `ls -1 ${quoteShellArg(binDir)} 2>/dev/null || true`,
        );
        if (!raw) return [];
        return raw
          .split("\n")
          .filter(Boolean)
          .map((n) => ({
            name: n,
            current: "?",
            latest: "?",
            website: getPackageUrl("go", n),
          }));
      } catch {
        return [];
      }
    }
    case "mas":
    default:
      return [];
  }
}
