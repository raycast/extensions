import { getPreferenceValues } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { existsSync } from "fs";
import { ReactElement, useState } from "react";
import { NotInstalledError } from "../components";
import { HistoryEntry, Preferences, SearchResult } from "../interfaces";
import { getPlacesDbPath } from "../util";

const whereClauses = (terms: string[]) => {
  return terms.map((t) => `b.title LIKE '%${t}%'`).join(" AND ");
};

const getBookmarkQuery = (query?: string) => {
  const preferences = getPreferenceValues<Preferences>();
  const terms = query ? query.trim().split(" ") : [];
  const whereClause = terms.length > 0 ? `AND ${whereClauses(terms)}` : "";

  return `WITH BookmarkEntries AS (
    SELECT
      b.*,
      p.url,
      datetime(b.lastModified/1000000,'unixepoch') as lastModified,
      ROW_NUMBER() OVER (PARTITION BY b.fk ORDER BY b.id) as rn
    FROM moz_bookmarks b
    JOIN moz_places p ON b.fk = p.id
    WHERE b.type = 1 ${whereClause}
  )
  SELECT id, url, title, lastModified
  FROM BookmarkEntries
  WHERE rn = 1
  ORDER BY lastModified DESC
  LIMIT ${preferences.limitResults};`;
};

export function useBookmarkSearch(query: string | undefined): SearchResult<HistoryEntry> {
  const inQuery = getBookmarkQuery(query);
  const dbPath = getPlacesDbPath();
  const [retryCount, setRetryCount] = useState(0);

  if (!existsSync(dbPath)) {
    return { data: [], isLoading: false, errorView: <NotInstalledError /> };
  }

  const { isLoading, data, permissionView } = useSQL<HistoryEntry>(dbPath, inQuery, {
    onError: (error) => {
      const isRetryableError =
        error.message?.includes("database is locked") || error.message?.includes("disk image is malformed");

      if (isRetryableError && retryCount < 3) {
        setTimeout(() => {
          setRetryCount(retryCount + 1);
        }, 100 * (retryCount + 1));
      }
    },
  });

  return { data, isLoading, errorView: permissionView as ReactElement };
}
