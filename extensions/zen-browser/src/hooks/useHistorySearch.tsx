import { ReactElement } from "react";
import { existsSync } from "fs";
import { useSQL } from "@raycast/utils";
import { SearchResult, HistoryEntry } from "../interfaces";
import { getPlacesDbPath, getHistoryQuery } from "../util";
import { NotInstalledError } from "../components";

export function useHistorySearch(query: string | undefined): SearchResult<HistoryEntry> {
  const inQuery = getHistoryQuery(query);
  const dbPath = getPlacesDbPath();

  if (!existsSync(dbPath)) {
    return { data: [], isLoading: false, errorView: <NotInstalledError /> };
  }
  const { isLoading, data, permissionView } = useSQL<HistoryEntry>(dbPath, inQuery);
  return { data, isLoading, errorView: permissionView as ReactElement };
}
