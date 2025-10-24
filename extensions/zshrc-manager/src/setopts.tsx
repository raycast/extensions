import { Icon, List } from "@raycast/api";
import { parseSetopts } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";

/**
 * Setopt item interface
 */
interface SetoptItem extends FilterableItem {
  option: string;
}

/**
 * Setopts management command for zshrc content
 */
export default function Setopts() {
  return (
    <ListViewController<SetoptItem>
      commandName="Setopts"
      navigationTitle="Setopts"
      searchPlaceholder="Search setopt options..."
      icon={Icon.Gear}
      tintColor={MODERN_COLORS.success}
      itemType="setopt"
      itemTypePlural="setopts"
      parser={parseSetopts}
      searchFields={["option", "section"]}
      generateTitle={(setopt) => setopt.option}
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
      generateItemMarkdown={(setopt) => `
# Setopt: \`${setopt.option}\`

## ⚙️ Option Configuration
\`\`\`zsh
setopt ${setopt.option}
\`\`\`

## 📍 Location
- **Section**: ${setopt.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${setopt.sectionStartLine}

## 💡 About This Option
- **Name**: ${setopt.option}
- **Type**: Zsh Shell Option
- **Purpose**: Configure shell behavior

## 📚 Option Information
- **HIST_* options**: Control command history behavior
- **setopt**: Enable an option
- **unsetopt**: Disable an option
- **set -o**: Alternative syntax for setting options

## 🔍 Common Related Options
- History: HIST_EXPIRE_DUPS_FIRST, HIST_IGNORE_DUPS, SHARE_HISTORY
- Jobs: NOTIFY, NO_HUP, BG_NICE
- Prompts: PROMPT_SUBST, TRANSIENT_RPROMPT
- Expansion: EXTENDED_GLOB, NOMATCH, NULL_GLOB

## 📖 Documentation
Run \`man zshopptions\` in your terminal to see detailed documentation on all available setopts.
      `}
      generateMetadata={(setopt) => (
        <>
          <List.Item.Detail.Metadata.Label
            title="Option Name"
            text={setopt.option}
            icon={{
              source: Icon.Gear,
              tintColor: MODERN_COLORS.success,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={setopt.section}
            icon={{
              source: Icon.Folder,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="File"
            text="~/.zshrc"
            icon={{
              source: Icon.Document,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Type"
            text="Shell Option"
            icon={{
              source: Icon.Gear,
              tintColor: MODERN_COLORS.warning,
            }}
          />
        </>
      )}
    />
  );
}
