import { ComponentType, createContext, useContext, useMemo } from "react";
import { List, Action, Application, getApplications, Detail, Icon, ActionPanel } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { existsSync } from "fs";
import { URL } from "url";
import { getEntry } from "./lib/entry";
import { zedBuild } from "./lib/preferences";
import { getZedBundleId } from "./lib/zed";
import { useZedRecentWorkspaces, ZedEntry, getPath, getSchemaVersionSync, getQueryForSchema } from "./lib/zedEntries";
import { usePinnedEntries } from "./hooks/usePinnedEntries";
import { EntryItem } from "./components/EntryItem";

const ZedContext = createContext<{
  zed?: Application;
  schemaVersion?: number;
  query?: string | null;
}>({
  zed: undefined,
  schemaVersion: undefined,
  query: undefined,
});

function exists(p: string) {
  try {
    return existsSync(new URL(p));
  } catch {
    return false;
  }
}

export const withZed = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const { data: zed, isLoading } = useCachedPromise(
      async () => {
        const applications = await getApplications();
        const zedBundleId = getZedBundleId(zedBuild);
        return applications.find((a) => a.bundleId === zedBundleId);
      },
      [],
      {
        keepPreviousData: true,
      },
    );

    const { schemaVersion, query } = useMemo(() => {
      if (!zed) {
        return { schemaVersion: undefined, query: undefined };
      }

      const path = getPath();
      if (!existsSync(path)) {
        return { schemaVersion: undefined, query: undefined };
      }

      const version = getSchemaVersionSync(path);
      return {
        schemaVersion: version,
        query: getQueryForSchema(version),
      };
    }, [zed]);

    if (!zed) {
      return <Detail isLoading={isLoading} markdown={isLoading ? "" : `No Zed app detected`} />;
    }

    return (
      <ZedContext.Provider value={{ zed, schemaVersion, query }}>
        <Component {...props} />
      </ZedContext.Provider>
    );
  };
};

export function Command() {
  const { zed, schemaVersion, query } = useContext(ZedContext);
  const { entries, isLoading, error, removeEntry, removeAllEntries } = useZedRecentWorkspaces(schemaVersion, query);
  const { pinnedEntries, pinEntry, unpinEntry, unpinAllEntries, moveUp, moveDown } = usePinnedEntries();

  const pinned = Object.values(pinnedEntries)
    .filter((e) => exists(e.uri) || e.host)
    .sort((a, b) => a.order - b.order);
  const zedIcon = zed ? { fileIcon: zed?.path } : undefined;

  const removeAndUnpinEntry = async (entry: Pick<ZedEntry, "id" | "uri">) => {
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
        {pinned.map((e) => {
          const entry = getEntry(e);

          if (!entry) {
            return null;
          }

          return (
            <EntryItem
              key={entry.uri}
              entry={entry}
              actions={
                <ActionPanel>
                  <Action.Open title="Open in Zed" target={entry.uri} application={zed} icon={zedIcon} />
                  {!entry.is_remote && <Action.ShowInFinder path={entry.path} />}
                  <Action
                    title="Unpin Entry"
                    icon={Icon.PinDisabled}
                    onAction={() => unpinEntry(e)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                  {e.order > 0 ? (
                    <Action
                      title="Move up"
                      icon={Icon.ArrowUp}
                      onAction={() => moveUp(e)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    />
                  ) : null}
                  {e.order < pinned.length - 1 ? (
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      onAction={() => moveDown(e)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    />
                  ) : null}
                  <RemoveActionSection
                    onRemoveEntry={() => removeAndUnpinEntry(e)}
                    onRemoveAllEntries={removeAllAndUnpinEntries}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Recent Projects">
        {Object.values(entries)
          .filter((e) => !pinnedEntries[e.uri] && (!!e.host || exists(e.uri)))
          .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
          .map((e) => {
            const entry = getEntry(e);

            if (!entry) {
              return null;
            }

            return (
              <EntryItem
                key={entry.uri}
                entry={entry}
                actions={
                  <ActionPanel>
                    <Action.Open title="Open in Zed" target={entry.uri} application={zed} icon={zedIcon} />
                    {!entry.is_remote && <Action.ShowInFinder path={entry.path} />}
                    <Action
                      title="Pin Entry"
                      icon={Icon.Pin}
                      onAction={() => pinEntry(e)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                    <RemoveActionSection
                      onRemoveEntry={() => removeAndUnpinEntry(e)}
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
