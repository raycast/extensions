import {
  Action,
  ActionPanel,
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { useState, useEffect, useRef } from "react";
import * as path from "path";
import * as fs from "fs";
import * as iconv from "iconv-lite";

const execFileAsync = promisify(execFile);

interface Preferences {
  esPath: string;
  maxResults: string;
}

interface SearchResult {
  filePath: string;
  fileName: string;
  dirName: string;
}

/** Decode a Buffer or string from es.exe (GBK on Chinese Windows) */
function decodeEsOutput(output: string | Buffer): string {
  if (typeof output === "string") {
    // If it's already a string, it was decoded as UTF-8 — may be garbled
    // Try re-encoding: convert the garbled string back to latin1 bytes, then decode as GBK
    try {
      const buf = Buffer.from(output, "latin1");
      const decoded = iconv.decode(buf, "gbk");
      // Check if decoded contains replacement chars
      if (decoded.includes("\ufffd")) return output; // bad decode, keep original
      return decoded;
    } catch {
      return output;
    }
  }
  // It's a Buffer — try GBK first, fallback to UTF-8
  try {
    const decoded = iconv.decode(output, "gbk");
    if (!decoded.includes("\ufffd")) return decoded;
  } catch {
    // ignore
  }
  try {
    return iconv.decode(output, "utf-8");
  } catch {
    return output.toString("utf-8");
  }
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const esPath = prefs.esPath || "C:\\Program Files\\Everything\\es.exe";
  const maxResults = parseInt(prefs.maxResults || "50", 10);

  const esExists = fs.existsSync(esPath);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setTotalCount(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query.trim());
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function performSearch(searchText: string) {
    if (!esExists) return;

    setIsLoading(true);
    try {
      // Get total count
      const countResult = await execFileAsync(esPath, [
        "-full-path-and-name",
        "-get-result-count",
        "-n",
        "1000000",
        searchText,
      ]);
      const countStr = decodeEsOutput(countResult.stdout).trim() || "0";
      setTotalCount(parseInt(countStr, 10) || null);

      // Get results — use encoding:buffer to get raw bytes from es.exe
      const result = await promisify(execFile)(esPath, [
        "-full-path-and-name",
        "-sort",
        "date-modified",
        "-n",
        String(maxResults),
        searchText,
      ], { encoding: 'buffer' as const }) as { stdout: Buffer; stderr: Buffer };

      const decodedOutput = decodeEsOutput(result.stdout);
      const lines = decodedOutput
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const parsed: SearchResult[] = [];
      for (const line of lines) {
        try {
          const filePath = line;
          const fileName = path.basename(filePath);
          const dirName = path.dirname(filePath);
          parsed.push({ filePath, fileName, dirName });
        } catch {
          // skip unparseable lines
        }
      }
      setResults(parsed);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes("was killed")) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: msg,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  function openFile(filePath: string) {
    open(filePath);
  }

  function showInExplorer(filePath: string) {
    execFile("explorer", ["/select,", filePath]);
  }

  async function copyFilePath(filePath: string) {
    const { Clipboard } = await import("@raycast/api");
    await Clipboard.copy(filePath);
    showToast({ title: "Path copied", message: filePath });
  }

  // ---------- Empty state: es.exe not found ----------
  if (!esExists) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="es.exe not found"
          description={`Expected at: ${esPath}\n\nMake sure Everything is installed.\nYou can change the path in Extension Preferences.`}
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder="Search files with Everything..."
      onSearchTextChange={setQuery}
      isLoading={isLoading}
      throttle
    >
      {query.trim() === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to start searching"
          description="Powered by Everything (Voidtools)"
        />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No files found"
          description={`Try a different search term.\nTotal matches: ${totalCount ?? "?"}`}
        />
      ) : (
        results.map((r, i) => (
          <List.Item
            key={`${r.filePath}-${i}`}
            icon={
              fs.existsSync(r.filePath)
                ? { fileIcon: r.filePath }
                : Icon.Document
            }
            title={r.fileName}
            subtitle={r.dirName}
            accessories={
              totalCount !== null
                ? [{ text: i === 0 ? `${totalCount} matches` : undefined }]
                : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title="Open File"
                  icon={Icon.Document}
                  onAction={() => openFile(r.filePath)}
                />
                <Action
                  title="Show in Explorer"
                  icon={Icon.Folder}
                  onAction={() => showInExplorer(r.filePath)}
                />
                <Action
                  title="Copy File Path"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => copyFilePath(r.filePath)}
                />
                <Action.OpenWith path={r.filePath} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
