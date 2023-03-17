import { List, Action, open, closeMainWindow } from "@raycast/api";
import { existsSync } from "fs";
import { URL } from "url";
import { getEntry } from "./lib/entry";
import { useZedEntries } from "./hooks/useZedEntries";
import { EntryItem } from "./components/EntryItem";

const bundleIdentifier = "dev.zed.Zed";

export default function Command() {
  const { entries } = useZedEntries();

  return (
    <List>
      {Object
        .values(entries)
        .filter(e => existsSync(new URL(e.uri)))
        .map((e) => {
          const entry = getEntry(e.uri);
          return (
            <EntryItem key={entry.uri} entry={entry} icon={entry.path && { fileIcon: entry.path }}>
              <Action
                title="Open in Zed"
                onAction={async () => {
                  await open(entry.uri, bundleIdentifier);
                  await closeMainWindow();
                }}
              />
            </EntryItem>
          );
        })}
    </List>
  );
}
