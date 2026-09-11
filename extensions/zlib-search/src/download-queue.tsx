import React from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import {
  QueueItem,
  QUEUE_STORAGE_KEY,
  buildExecEnv,
  downloadBook,
  resolveZlibPath,
  runBulkDownload,
  truncate,
} from "./lib/zlib";

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const zlibPath = resolveZlibPath(prefs.zlibPath);
  const downloadDir = prefs.downloadDir || "~/Downloads";
  const execEnv = buildExecEnv(prefs.zlibDomain);

  const {
    value: queue = [],
    setValue: setQueue,
    isLoading,
  } = useLocalStorage<QueueItem[]>(QUEUE_STORAGE_KEY, []);

  const pending = queue.filter((item) => !item.downloaded);
  const downloaded = queue.filter((item) => item.downloaded);

  function markDownloaded(id: string) {
    setQueue(
      queue.map((item) =>
        item.id === id ? { ...item, downloaded: true } : item,
      ),
    );
  }

  async function removeFromQueue(id: string) {
    await setQueue(queue.filter((item) => item.id !== id));
  }

  async function handleDownloadOne(item: QueueItem) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading ${truncate(item.name)}`,
      message: "0s",
    });
    const startedAt = Date.now();
    const elapsedTimer = setInterval(() => {
      toast.message = `${Math.round((Date.now() - startedAt) / 1000)}s`;
    }, 1000);

    try {
      await downloadBook(zlibPath, item, downloadDir, execEnv);
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded";
      toast.message = item.name;
      markDownloaded(item.id);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      clearInterval(elapsedTimer);
    }
  }

  async function handleDownloadAllPending() {
    if (pending.length === 0) return;
    await runBulkDownload(pending, {
      zlibPath,
      downloadDir,
      execEnv,
      onEachResult: (result) => {
        if (result.success) markDownloaded(result.book.id);
      },
    });
  }

  async function handleClearDownloaded() {
    if (downloaded.length === 0) return;
    const confirmed = await confirmAlert({
      title: "Clear downloaded books?",
      message: `This removes ${downloaded.length} downloaded book${downloaded.length === 1 ? "" : "s"} from the queue. This doesn't delete the files themselves.`,
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await setQueue(queue.filter((item) => !item.downloaded));
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter queued books…">
      {queue.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="Queue is empty"
          description='Add books from "Search Books" with the Add to Queue action.'
        />
      ) : (
        <>
          <List.Section title="Queued" subtitle={`${pending.length}`}>
            {pending.map((item) => (
              <List.Item
                key={item.id}
                title={item.name}
                subtitle={item.authors?.join(", ") ?? ""}
                icon={{ source: Icon.Bookmark, tintColor: Color.Blue }}
                accessories={[
                  item.extension ? { tag: item.extension } : {},
                  item.size ? { text: item.size } : {},
                  item.year ? { text: item.year } : {},
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Download"
                      icon={Icon.Download}
                      onAction={() => handleDownloadOne(item)}
                    />
                    {pending.length > 1 ? (
                      <Action
                        title={`Download All Queued (${pending.length})`}
                        icon={Icon.Tray}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={handleDownloadAllPending}
                      />
                    ) : null}
                    {item.url ? (
                      <Action.OpenInBrowser
                        url={item.url}
                        title="Open in Browser"
                      />
                    ) : null}
                    <Action.CopyToClipboard
                      title="Copy to Clipboard"
                      content={item.id}
                    />
                    <Action
                      title="Remove from Queue"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => removeFromQueue(item.id)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section title="Downloaded" subtitle={`${downloaded.length}`}>
            {downloaded.map((item) => (
              <List.Item
                key={item.id}
                title={item.name}
                subtitle={item.authors?.join(", ") ?? ""}
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                accessories={[
                  { tag: { value: "Downloaded", color: Color.Green } },
                  item.extension ? { tag: item.extension } : {},
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Download Again"
                      icon={Icon.Download}
                      onAction={() => handleDownloadOne(item)}
                    />
                    {item.url ? (
                      <Action.OpenInBrowser
                        url={item.url}
                        title="Open in Browser"
                      />
                    ) : null}
                    <Action
                      title="Remove from Queue"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => removeFromQueue(item.id)}
                    />
                    <Action
                      title="Clear All Downloaded"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{
                        modifiers: ["cmd", "shift"],
                        key: "backspace",
                      }}
                      onAction={handleClearDownloaded}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
