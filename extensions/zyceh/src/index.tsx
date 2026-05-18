import {
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  environment,
} from "@raycast/api";
import { useEffect, useReducer, useState } from "react";
import { spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync, watch } from "fs";
import path from "path";

interface Preferences {
  allowlist: string;
  targetLayout: string;
}

interface Config {
  allowlist: string[];
  targetLayout: string;
  enabled: boolean;
}

const FALLBACK_LAYOUT = "com.apple.keylayout.Australian";
const daemonPath = path.join(environment.assetsPath, "daemon");
const configPath = path.join(environment.supportPath, "config.json");
const statePath = path.join(environment.supportPath, "state.json");
const pidPath = path.join(environment.supportPath, "daemon.pid");

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(readFileSync(filePath, "utf8")) };
  } catch {
    return fallback;
  }
}

function writeConfig(config: Config) {
  writeFileSync(configPath, JSON.stringify(config));
}

function isDaemonRunning(): boolean {
  if (!existsSync(pidPath)) return false;
  try {
    process.kill(parseInt(readFileSync(pidPath, "utf8").trim(), 10), 0);
    return true;
  } catch {
    return false;
  }
}

function startDaemon() {
  if (isDaemonRunning()) return;
  spawn(daemonPath, [environment.supportPath], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();

  // Read display values directly from the daemon's state file on every render.
  // No useState — stale closures can't accumulate, and every menu open gets fresh values.
  const { currentApp, status } = readJSON(statePath, {
    currentApp: "—",
    status: "—",
  });

  // enabled is the only value the user can change from the UI, so it needs useState.
  const [enabled, setEnabled] = useState<boolean>(
    () => readJSON(configPath, { enabled: true }).enabled,
  );

  // Re-render whenever the daemon writes a new state — fs.watch on a stable inode,
  // no polling, no interval.
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!existsSync(statePath)) writeFileSync(statePath, "{}");
    const watcher = watch(statePath, (event) => {
      if (event === "change") rerender();
    });
    return () => watcher.close();
  }, []);

  // Write config and (re)start daemon on mount and whenever enabled changes.
  useEffect(() => {
    writeConfig({
      allowlist: prefs.allowlist
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      targetLayout: prefs.targetLayout || FALLBACK_LAYOUT,
      enabled,
    });
    startDaemon();
  }, [prefs.allowlist, prefs.targetLayout, enabled]);

  function handleToggle() {
    setEnabled((prev) => !prev);
  }

  return (
    <MenuBarExtra
      icon={{
        source: enabled ? "toolbar-icon.png" : "toolbar-icon-paused.png",
      }}
      tooltip={
        enabled ? "Language Switcher: active" : "Language Switcher: paused"
      }
    >
      <MenuBarExtra.Item title={`App: ${currentApp}`} />
      <MenuBarExtra.Item title={`Status: ${status || "—"}`} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={enabled ? "Pause" : "Resume"}
        onAction={handleToggle}
      />
      <MenuBarExtra.Item
        title="Configure…"
        onAction={() =>
          launchCommand({ name: "configure", type: LaunchType.UserInitiated })
        }
      />
    </MenuBarExtra>
  );
}
