import { Icon, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseSetopts } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";

/**
 * Setopt item interface
 */
interface SetoptItem extends FilterableItem {
  option: string;
}

interface SetoptsProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Setopts management command for zshrc content
 */
export default function Setopts({ searchBarAccessory }: SetoptsProps) {
  return (
    <ListViewController<SetoptItem>
      commandName="Setopts"
      navigationTitle="Setopts"
      searchPlaceholder="Search Setopt Options..."
      icon={Icon.Gear}
      tintColor={MODERN_COLORS.success}
      itemType="setopt"
      itemTypePlural="setopts"
      parser={parseSetopts}
      searchFields={["option", "section"]}
      searchBarAccessory={searchBarAccessory}
      generateTitle={(setopt) => setopt.option}
      getItemName={(setopt) => setopt.option}
      getItemValue={(setopt) => `setopt ${setopt.option}`}
      generateOverviewMarkdown={(_, allSetopts, grouped) => `
# Setopt Summary

Your \`.zshrc\` file contains **${allSetopts.length} setopts** across **${allSetopts.length > 0 ? Object.keys(grouped).length : 0} sections**.

## ⚙️ What are Setopts?
Setopts are Zsh shell options that control the shell's behavior. They enable or disable various features like history management, job control, prompt expansion, and more.

## 📊 Quick Stats
- **Total Setopts**: ${allSetopts.length}
- **Sections with Setopts**: ${Object.keys(grouped).length}

## 💡 Common Setopts
- **HIST_EXPIRE_DUPS_FIRST**: Expire duplicates first in history
- **HIST_IGNORE_DUPS**: Don't store duplicate commands in history
- **HIST_IGNORE_SPACE**: Don't store commands starting with space
- **SHARE_HISTORY**: Share history across sessions
- **APPEND_HISTORY**: Append instead of overwriting history
- **EXTENDED_HISTORY**: Save timestamps in history
- **INC_APPEND_HISTORY**: Incrementally append to history

## 📚 Option Categories
- **History**: HIST_* options
- **Job Control**: Job control related options
- **Prompts**: Prompt expansion options
- **Expansion**: Variable/glob expansion options
- **Completion**: Completion behavior options
      `}
      omitValueMarkdown={true}
      generateMetadata={(setopt) => (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Option"
            text={setopt.option}
            icon={{ source: Icon.Gear, tintColor: MODERN_COLORS.neutral }}
          />
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={setopt.section}
            icon={{
              source: Icon.Folder,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
          <List.Item.Detail.Metadata.Label title="Section Starts" text={`Line ${setopt.sectionStartLine}`} />
          <List.Item.Detail.Metadata.Label title="File" text="~/.zshrc" icon={Icon.Document} />
        </List.Item.Detail.Metadata>
      )}
    />
  );
}
