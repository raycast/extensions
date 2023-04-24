import type { FC, PropsWithChildren } from "react";
import { List, ActionPanel } from "@raycast/api";
import { Entry } from "../lib/entry";

export interface EntryItemProps extends Pick<List.Item.Props, "icon" | "accessoryIcon"> {
  entry: Entry;
}

export const EntryItem: FC<PropsWithChildren<EntryItemProps>> = ({ entry, children, ...props }) => {
  return (
    <List.Item
      title={entry.title}
      subtitle={entry.subtitle}
      actions={children && <ActionPanel>{children}</ActionPanel>}
      {...props}
    />
  );
};
