import React, { useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Color,
} from "@raycast/api";
import { useExec, useLocalStorage } from "@raycast/utils";
import {
  Book,
  QueueItem,
  QUEUE_STORAGE_KEY,
  buildExecEnv,
  downloadBook,
  resolveZlibPath,
  runBulkDownload,
  truncate,
} from "./lib/zlib";

interface SearchResult {
  books: Book[];
  page: number;
  total_pages: number;
}

const EMPTY_RESULT: SearchResult = { books: [], page: 0, total_pages: 0 };

export default function Command() {
  const [searchText, setSearchText] = useState("");
  // Keyed by id but storing the full Book, not just the id: a book selected
  // in an earlier search no longer appears in `books` once the user searches
  // again, so resolving selections against the current results would lose it.
  const [selectedBooks, setSelectedBooks] = useState<Map<string, Book>>(
    new Map(),
  );
  const prefs = getPreferenceValues<Preferences>();
  const zlibPath = resolveZlibPath(prefs.zlibPath);
  const downloadDir = prefs.downloadDir || "~/Downloads";
  const execEnv = buildExecEnv(prefs.zlibDomain);

  const { value: queue = [], setValue: setQueue } = useLocalStorage<
    QueueItem[]
  >(QUEUE_STORAGE_KEY, []);

  const { isLoading, data } = useExec(
    zlibPath,
    ["search", searchText, "--json", "--count", "30"],
    {
      execute: searchText.trim().length > 0,
      env: execEnv,
      parseOutput: ({ stdout, stderr, error, exitCode, signal, timedOut }) => {
        if (error || exitCode !== 0 || signal || timedOut) {
          throw new Error(
            stderr.trim() ||
              error?.message ||
              "Search failed. Check your zlib installation and login.",
          );
        }
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
  const isQueued = (id: string) => queue.some((item) => item.id === id);

  async function handleDownload(book: Book) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading ${truncate(book.name)}`,
      message: "0s",
    });

    const startedAt = Date.now();
    const elapsedTimer = setInterval(() => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      toast.message = `${seconds}s`;
    }, 1000);

    try {
      await downloadBook(zlibPath, book, downloadDir, execEnv);
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded";
      toast.message = book.name;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      clearInterval(elapsedTimer);
    }
  }

  function toggleSelected(book: Book) {
    setSelectedBooks((prev) => {
      const next = new Map(prev);
      if (next.has(book.id)) next.delete(book.id);
      else next.set(book.id, book);
      return next;
    });
  }

  async function toggleQueued(book: Book) {
    if (isQueued(book.id)) {
      await setQueue(queue.filter((item) => item.id !== book.id));
      await showToast({ title: "Removed from queue", message: book.name });
    } else {
      const entry: QueueItem = {
        ...book,
        downloaded: false,
        queuedAt: Date.now(),
      };
      await setQueue([...queue, entry]);
      await showToast({ title: "Added to queue", message: book.name });
    }
  }

  async function handleDownloadSelected() {
    const selected = Array.from(selectedBooks.values());
    if (selected.length === 0) return;

    const results = await runBulkDownload(selected, {
      zlibPath,
      downloadDir,
      execEnv,
    });

    // Keep failed downloads selected (with their full data) so the user can
    // retry; clear the rest.
    const failed = new Map(
      results
        .filter((r) => !r.success)
        .map((r) => [r.book.id, r.book] as const),
    );
    setSelectedBooks(failed);
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
        books.map((book, i) => {
          const selected = selectedBooks.has(book.id);
          const queued = isQueued(book.id);
          return (
            <List.Item
              key={`${book.id}-${i}`}
              title={book.name}
              subtitle={book.authors?.join(", ") ?? ""}
              icon={
                selected
                  ? { source: Icon.CheckCircle, tintColor: Color.Blue }
                  : Icon.Circle
              }
              accessories={[
                queued
                  ? { icon: Icon.Bookmark, tooltip: "In download queue" }
                  : {},
                book.extension ? { tag: book.extension } : {},
                book.size ? { text: book.size } : {},
                book.year ? { text: book.year } : {},
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
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
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Selection">
                    <Action
                      title={selected ? "Deselect" : "Select"}
                      icon={selected ? Icon.Circle : Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => toggleSelected(book)}
                    />
                    {selectedBooks.size > 0 ? (
                      <Action
                        title={`Download Selected (${selectedBooks.size})`}
                        icon={Icon.Tray}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={handleDownloadSelected}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Download Queue">
                    <Action
                      title={queued ? "Remove from Queue" : "Add to Queue"}
                      icon={queued ? Icon.BookmarkFilled : Icon.Bookmark}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      onAction={() => toggleQueued(book)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
