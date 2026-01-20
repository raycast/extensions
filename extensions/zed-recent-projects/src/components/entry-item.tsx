import { useEffect, useState } from "react";
import { Color, Icon, List } from "@raycast/api";
import { Entry } from "../lib/entry";
import { getGitBranch } from "../lib/git";
import { showFailureToast } from "@raycast/utils";
import { showGitBranch, projectIconStyle, showOpenStatus } from "../lib/preferences";
import ColorHash from "color-hash";

const colorHash = projectIconStyle === "colored-dot" ? new ColorHash({ saturation: 0.7, lightness: 0.7 }) : null;

export interface EntryItemProps extends Pick<List.Item.Props, "icon" | "accessoryIcon" | "actions" | "keywords"> {
  entry: Entry;
}

function useGitBranch(path: string) {
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    if (showGitBranch) {
      async function fetchGitBranch() {
        if (path) {
          try {
            const branch = await getGitBranch(path);
            setBranch(branch);
          } catch (error) {
            showFailureToast(error, {
              title: "Failed to get Git branch",
            });
          }
        }
      }

      fetchGitBranch();
    }
  }, [path]);

  return branch;
}

function getEntryIcon(entry: Entry): List.Item.Props["icon"] {
  if (entry.type === "remote") {
    return "remote.svg";
  }

  // Use colored dots if preference is enabled
  if (projectIconStyle === "colored-dot" && colorHash) {
    return { source: Icon.Dot, tintColor: colorHash.hex(entry.title) };
  }

  // Default: use folder icon
  return entry.path ? { fileIcon: entry.path } : Icon.Folder;
}

export const EntryItem = ({ entry, ...props }: EntryItemProps) => {
  const branch = entry.type === "local" && entry.path ? useGitBranch(entry.path) : undefined;

  const accessories: List.Item.Accessory[] = [];

  if (showOpenStatus && entry.isOpen) {
    accessories.push({
      tag: { value: "Open", color: Color.Green },
    });
  }

  if (branch) {
    accessories.push({
      tag: branch,
      icon: { source: "git-branch.svg", tintColor: Color.SecondaryText },
      tooltip: `Git Branch: ${branch}`,
    });
  }

  return (
    <List.Item
      title={entry.title}
      subtitle={{
        value: entry.subtitle,
        tooltip: entry.subtitle,
      }}
      accessories={accessories}
      icon={getEntryIcon(entry)}
      {...props}
    />
  );
};
