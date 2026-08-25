import React, { useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execFileAsync = promisify(execFile);

const ZLIB_PATH_CANDIDATES = ["/opt/homebrew/bin/zlib", "/usr/local/bin/zlib"];

function resolveZlibPath(configuredPath: string): string {
  if (configuredPath) return configuredPath;
  return ZLIB_PATH_CANDIDATES.find((path) => existsSync(path)) ?? "zlib";
}

interface Book {
  id: string;
  hash?: string;
  url: string;
  name: string;
  authors?: string[];
  year?: string;
  extension?: string;
  size?: string;
  rating?: string;
}

interface SearchResult {
  books: Book[];
  page: number;
  total_pages: number;
}

const EMPTY_RESULT: SearchResult = { books: [], page: 0, total_pages: 0 };

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const prefs = getPreferenceValues<Preferences>();
  const zlibPath = resolveZlibPath(prefs.zlibPath);
  const downloadDir = prefs.downloadDir || "~/Downloads";

  const execEnv: NodeJS.ProcessEnv = { ...process.env };
  if (prefs.zlibDomain) execEnv.ZLIB_DOMAIN = prefs.zlibDomain;

  const { isLoading, data } = useExec(
    zlibPath,
    ["search", searchText, "--json", "--count", "30"],
    {
      execute: searchText.trim().length > 0,
      env: execEnv,
      parseOutput: ({ stdout }) => {
        try {
          return JSON.parse(stdout) as SearchResult;
        } catch {
          return EMPTY_RESULT;
        }
      },
      keepPreviousData: true,
      failureToastOptions: { title: "Search failed" },
    },
  );

  const books = data?.books ?? [];

  async function handleDownload(book: Book) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading…",
      message: book.name,
    });
    try {
      await execFileAsync(
        zlibPath,
        ["download", book.id, "--dir", downloadDir],
        { env: execEnv },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded";
      toast.message = book.name;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Z-Library…"
      throttle
    >
      {searchText.trim().length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Z-Library"
          description="Type a title, author, or keyword to search."
        />
      ) : books.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No results"
          description={`No books found for "${searchText}"`}
        />
      ) : (
        books.map((book, i) => (
          <List.Item
            key={`${book.id}-${i}`}
            title={book.name}
            subtitle={book.authors?.join(", ") ?? ""}
            accessories={[
              book.extension ? { tag: book.extension } : {},
              book.size ? { text: book.size } : {},
              book.year ? { text: book.year } : {},
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Download"
                  icon={Icon.Download}
                  onAction={() => handleDownload(book)}
                />
                {book.url ? (
                  <Action.OpenInBrowser
                    url={book.url}
                    title="Open in Browser"
                  />
                ) : null}
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  content={book.id}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
