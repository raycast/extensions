import fs from "fs";
import { homedir } from "os";
import { useSQL } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { getZedDbName } from "./zed";

const preferences = getPreferenceValues<Preferences>();
const zedBuild = preferences.build;

export interface ZedEntry {
  uri: string;
  lastOpened: number;
}

export type ZedEntries = Record<string, ZedEntry>;

function getPath() {
  return `${homedir()}/Library/Application Support/Zed/db/${getZedDbName(zedBuild)}/db.sqlite`;
}

interface Workspace {
  local_paths: string;
  timestamp: number;
}

interface ZedRecentWorkspaces {
  entries: ZedEntries;
  isLoading?: boolean;
  error?: Error;
}

export function useZedRecentWorkspaces(): ZedRecentWorkspaces {
  const path = getPath();

  if (!fs.existsSync(path)) {
    return {
      entries: {},
    };
  }

  const { data, isLoading, error } = useSQL<Workspace>(path, "SELECT local_paths, timestamp FROM workspaces");

  return {
    entries: data
      ? data
          .filter((d) => !!d.local_paths)
          .map<ZedEntry>((d) => {
            const pathStart = d.local_paths.indexOf("/");
            return {
              uri: "file://" + d.local_paths.substring(pathStart).replace(/\/$/, ""),
              lastOpened: new Date(d.timestamp).getTime(),
            };
          })
          .reduce<ZedEntries>((acc, d) => {
            if (!d.uri) {
              return acc;
            }

            const existing = acc[d.uri];
            if (existing && existing.lastOpened > d.lastOpened) return acc;

            return {
              ...acc,
              [d.uri]: d,
            };
          }, {})
      : {},
    isLoading,
    error,
  };
}
