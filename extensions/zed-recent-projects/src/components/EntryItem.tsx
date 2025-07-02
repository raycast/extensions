import { useEffect, useState } from "react";
import { Color, List } from "@raycast/api";
import { Entry } from "../lib/entry";
import { getGitBranch } from "../lib/git";
import { showFailureToast } from "@raycast/utils";
import { showGitBranch } from "../lib/preferences";

export interface EntryItemProps extends Pick<List.Item.Props, "icon" | "accessoryIcon" | "actions"> {
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

export const EntryItem = ({ entry, ...props }: EntryItemProps) => {
  const branch = useGitBranch(entry.path);

  return (
    <List.Item
      title={entry.title}
      subtitle={entry.subtitle}
      accessories={
        branch
          ? [
              {
                tag: branch,
                icon: { source: "git-branch.svg", tintColor: Color.SecondaryText },
                tooltip: `Git Branch: ${branch}`,
              },
            ]
          : []
      }
      icon={entry.is_remote ? "remote.svg" : entry.path && { fileIcon: entry.path }}
      {...props}
    />
  );
};
