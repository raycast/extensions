import fs from "fs";
import { homedir } from "os";
import { useSQL } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { getZedDbName, type ZedBuild } from "./zed";

const preferences: Record<string, string> = getPreferenceValues();
const zedBuild: ZedBuild = preferences.build as ZedBuild;

export interface ZedEntry {
  uri: string;
  lastOpened: number;
}

export type ZedEntries = Record<string, ZedEntry>;

function getPath() {
  return `${homedir()}/Library/Application Support/Zed/db/${getZedDbName(zedBuild)}/db.sqlite`;
}

interface Workspace {
  workspace_location: string;
  timestamp: number;
}

interface ZedRecentWorkspaces {
  entries: ZedEntries;
  isLoading?: boolean;
}

export function useZedRecentWorkspaces(): ZedRecentWorkspaces {
  const path = getPath();

  if (!fs.existsSync(path)) {
    return {
      entries: {},
    };
  }

  const { data, isLoading } = useSQL<Workspace>(path, "SELECT workspace_location, timestamp FROM workspaces");

  return {
    entries: data
      ? data
          .filter((d) => !!d.workspace_location)
          .map<ZedEntry>((d) => {
            const pathStart = d.workspace_location.indexOf("/");
            return {
              uri: "file://" + d.workspace_location.substring(pathStart),
              lastOpened: new Date(d.timestamp).getTime(),
            };
          })
          .reduce<ZedEntries>((acc, d) => {
            if (!d.uri) {
              return acc;
            }
            return {
              ...acc,
              [d.uri]: d,
            };
          }, {})
      : {},
    isLoading,
  };
}
