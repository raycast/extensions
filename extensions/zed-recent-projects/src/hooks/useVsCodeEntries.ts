import { homedir } from "os";
import { existsSync } from "fs";
import { URL } from "url";
import { Application } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { getEntryFromVSCodeEntryUri, type Entry } from "../lib/entry";

export type VSCodeBuild = "Code" | "Code - Insiders" | "VSCodium";

export type VSCodeBundleId = "com.microsoft.VSCode" | "com.microsoft.VSCodeInsiders" | "com.vscodium";

export interface VSCodeApplication extends Application {
  bundleId: VSCodeBundleId;
}

const BundleIdBuildMapping: Record<VSCodeBundleId, VSCodeBuild> = {
  "com.microsoft.VSCode": "Code",
  "com.microsoft.VSCodeInsiders": "Code - Insiders",
  "com.vscodium": "VSCodium",
};

export type FolderEntry = {
  folderUri: string;
};

export type FileEntry = {
  fileUri: string;
};

export type VsCodeEntry = FolderEntry | FileEntry;

export function isFolderItem(entry: VsCodeEntry): entry is FolderEntry {
  const uri = (entry as FolderEntry).folderUri;
  return !!uri && existsSync(new URL(uri));
}

export function isFileItem(entry: VsCodeEntry): entry is FileEntry {
  const uri = (entry as FileEntry).fileUri;
  return !!uri && existsSync(new URL(uri));
}

export function useVsCodeEntries(bundleId: VSCodeBundleId) {
  const { data, isLoading } = useSQL<{ entries: string }>(
    `${homedir()}/Library/Application Support/${BundleIdBuildMapping[bundleId]}/User/globalStorage/state.vscdb`,
    "SELECT json_extract(value, '$.entries') as entries FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'"
  );

  const entries: Entry[] =
    data && data.length
      ? ((JSON.parse(data[0].entries) as VsCodeEntry[])
          .filter((i) => isFolderItem(i) || isFileItem(i))
          .map((i) => getEntryFromVSCodeEntryUri(isFolderItem(i) ? i.folderUri : i.fileUri))
          .filter((i) => !!i) as Entry[])
      : [];

  return { entries, isLoading };
}
