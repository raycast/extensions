import { List } from "@raycast/api";
import { Entry } from "../lib/entry";

export interface EntryItemProps extends Pick<List.Item.Props, "icon" | "accessoryIcon" | "actions"> {
  entry: Entry;
}

export const EntryItem = ({ entry, ...props }: EntryItemProps) => {
  return (
    <List.Item
      title={entry.title}
      subtitle={entry.subtitle}
      icon={entry.is_remote ? "remote.svg" : entry.path && { fileIcon: entry.path }}
      {...props}
    />
  );
};
