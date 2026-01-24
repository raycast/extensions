import { Action, ActionPanel, Icon, List, showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { useZedContext, withZed } from "./components/with-zed";
import { isWindows } from "./lib/utils";
import { exists } from "./lib/utils";
import { Entry, getEntry, getEntryPrimaryPath, isEntryMultiFolder } from "./lib/entry";
import { EntryItem } from "./components/entry-item";
import { usePinnedEntries } from "./hooks/use-pinned-entries";
import { useRecentWorkspaces } from "./hooks/use-recent-workspaces";
import { isMultiFolder } from "./lib/workspaces";
import { closeZedWindow, getZedBundleId, openWithZedCli, ZedBuild } from "./lib/zed";
import { showOpenStatus } from "./lib/preferences";
import { execWindowsZed } from "./lib/windows";
import { platform } from "os";

const isMac = platform() === "darwin";

export function Command() {
  const { dbPath, workspaceDbVersion, cliPath } = useZedContext();
  const { workspaces, isLoading, error, removeEntry, removeAllEntries, revalidate } = useRecentWorkspaces(
    dbPath,
    workspaceDbVersion,
  );

  const { pinnedEntries, pinEntry, unpinEntry, unpinAllEntries, moveUp, moveDown } = usePinnedEntries();

  // Create a set of pinned entry IDs for quick lookup
  const pinnedIds = new Set(Object.values(pinnedEntries).map((e) => e.id));

  // Filter pinned entries - exclude multi-folder if CLI not available
  const pinned = Object.values(pinnedEntries)
    .filter((e) => e.type === "remote" || exists(e.uri))
    .filter((e) => !isEntryMultiFolder(e) || !!cliPath) // Only show multi-folder if CLI available
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      ...entry,
      isOpen: workspaces[String(entry.id)]?.isOpen ?? false,
    }));

  const preferences = getPreferenceValues<Preferences>();
  const zedBuild = preferences.build as ZedBuild;
  const bundleId = getZedBundleId(zedBuild);

  const closeEntry = async (entry: Entry) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Closing project..." });
    const success = await closeZedWindow(entry.title, bundleId);
    if (success) {
      toast.style = Toast.Style.Success;
      toast.title = "Project closed";
      setTimeout(revalidate, 500);
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to close project";
      toast.message = "Window not found";
    }
  };

  const removeAndUnpinEntry = async (entry: Pick<Entry, "id" | "uri">) => {
    await removeEntry(entry.id);
    unpinEntry(entry);
  };

  const removeAllAndUnpinEntries = async () => {
    await removeAllEntries();
    unpinAllEntries();
  };

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No Recent Projects"
        description={error ? "Check that Zed is up-to-date" : undefined}
        icon="no-view.png"
      />
      <List.Section title="Pinned Projects">
        {pinned.map((entry) => {
          if (!entry) {
            return null;
          }

          return (
            <EntryItem
              key={entry.id}
              entry={entry}
              keywords={showOpenStatus ? [entry.isOpen ? "open" : "closed"] : undefined}
              actions={
                <ActionPanel>
                  <OpenInZedAction entry={entry} revalidate={revalidate} />
                  {isMac && entry.isOpen && (
                    <Action
                      title="Close Project Window"
                      icon={Icon.XMarkCircle}
                      onAction={() => closeEntry(entry)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                    />
                  )}
                  {entry.type === "local" &&
                    (isWindows ? (
                      <Action.Open title="Show in File Explorer" target={getEntryPrimaryPath(entry)} />
                    ) : (
                      <Action.ShowInFinder path={getEntryPrimaryPath(entry)} />
                    ))}
                  <Action
                    title="Unpin Entry"
                    icon={Icon.PinDisabled}
                    onAction={() => unpinEntry(entry)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                  {entry.order > 0 ? (
                    <Action
                      title="Move up"
                      icon={Icon.ArrowUp}
                      onAction={() => moveUp(entry)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    />
                  ) : null}
                  {entry.order < pinned.length - 1 ? (
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      onAction={() => moveDown(entry)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    />
                  ) : null}
                  <RemoveActionSection
                    onRemoveEntry={() => removeAndUnpinEntry(entry)}
                    onRemoveAllEntries={removeAllAndUnpinEntries}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Recent Projects">
        {Object.values(workspaces)
          .filter((ws) => !pinnedIds.has(ws.id))
          .filter((ws) => ws.type === "remote" || exists(ws.uri) || !!ws.wsl)
          .filter((ws) => !isMultiFolder(ws) || !!cliPath) // Only show multi-folder if CLI available
          .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
          .map((workspace) => {
            const entry = getEntry(workspace);

            if (!entry) {
              return null;
            }

            return (
              <EntryItem
                key={entry.id}
                entry={entry}
                keywords={showOpenStatus ? [entry.isOpen ? "open" : "closed"] : undefined}
                actions={
                  <ActionPanel>
                    <OpenInZedAction entry={entry} revalidate={revalidate} />
                    {isMac && entry.isOpen && (
                      <Action
                        title="Close Project Window"
                        icon={Icon.XMarkCircle}
                        onAction={() => closeEntry(entry)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                      />
                    )}
                    {entry.type === "local" &&
                      (isWindows ? (
                        <Action.Open title="Show in File Explorer" target={getEntryPrimaryPath(entry)} />
                      ) : (
                        <Action.ShowInFinder path={getEntryPrimaryPath(entry)} />
                      ))}
                    <Action
                      title="Pin Entry"
                      icon={Icon.Pin}
                      onAction={() => pinEntry(entry)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                    <RemoveActionSection
                      onRemoveEntry={() => removeAndUnpinEntry(entry)}
                      onRemoveAllEntries={removeAllAndUnpinEntries}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}

function OpenInZedAction({ entry, revalidate }: { entry: Entry; revalidate: () => void }) {
  const { app, cliPath } = useZedContext();
  const zedIcon = { fileIcon: app.path };
  const primaryPath = getEntryPrimaryPath(entry);

  // WSL support (Windows only)
  const openZedInWsl = () => execWindowsZed(["--wsl", `${entry.wsl?.user}@${entry.wsl?.distro}`, `/${primaryPath}`]);

  if (entry.wsl) {
    return <Action title="Open in Zed" onAction={openZedInWsl} icon={zedIcon} />;
  }

  // Multi-folder workspace - use CLI
  if (isEntryMultiFolder(entry) && cliPath) {
    const openMultiFolder = async () => {
      try {
        setTimeout(revalidate, 200);
        await closeMainWindow();
        await openWithZedCli(cliPath, entry.paths);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to open workspace",
          message: String(error),
        });
      }
    };
    return <Action title="Open in Zed" onAction={openMultiFolder} icon={zedIcon} />;
  }

  // If CLI available, use it for consistency (handles revalidation)
  if (cliPath) {
    const openSingleFolder = async () => {
      setTimeout(revalidate, 200);
      await closeMainWindow();
      await openWithZedCli(cliPath!, [entry.paths[0]]);
    };
    return <Action title="Open in Zed" icon={zedIcon} onAction={openSingleFolder} />;
  }

  // Fallback: open via URI scheme (no revalidation)
  return <Action.Open title="Open in Zed" target={entry.uri} application={app} icon={zedIcon} />;
}

function RemoveActionSection({
  onRemoveEntry,
  onRemoveAllEntries,
}: {
  onRemoveEntry: () => void;
  onRemoveAllEntries: () => void;
}) {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Trash}
        title="Remove from Recent Projects"
        style={Action.Style.Destructive}
        onAction={() => onRemoveEntry()}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />

      <Action
        icon={Icon.Trash}
        title="Remove All Recent Projects"
        style={Action.Style.Destructive}
        onAction={() => onRemoveAllEntries()}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      />
    </ActionPanel.Section>
  );
}

export default withZed(Command);
