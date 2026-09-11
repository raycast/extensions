import { Icon, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseEvals } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";

/**
 * Eval item interface
 */
interface EvalItem extends FilterableItem {
  command: string;
}

interface EvalsProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Evals management command for zshrc content
 */
export default function Evals({ searchBarAccessory }: EvalsProps) {
  return (
    <ListViewController<EvalItem>
      commandName="Evals"
      navigationTitle="Evals"
      searchPlaceholder="Search Eval Commands..."
      icon={Icon.Code}
      tintColor={MODERN_COLORS.warning}
      itemType="eval"
      itemTypePlural="evals"
      parser={parseEvals}
      searchFields={["command", "section"]}
      searchBarAccessory={searchBarAccessory}
      generateTitle={(evalItem) => truncateValueMiddle(evalItem.command)}
      getItemName={(evalItem) => evalItem.command}
      getItemValue={(evalItem) => evalItem.command}
      generateOverviewMarkdown={(_, allEvals, grouped) => `
# Eval Summary

Your \`.zshrc\` file contains **${allEvals.length} eval commands** across **${allEvals.length > 0 ? Object.keys(grouped).length : 0} sections**.

## ⚡ What are Eval Commands?
Eval commands execute code dynamically, typically used to initialize tools or runtimes. Common examples include \`eval "$(command init -)"\` patterns for tools like rbenv, nvm, or pyenv.

## 📊 Quick Stats
- **Total Evals**: ${allEvals.length}
- **Sections with Evals**: ${Object.keys(grouped).length}
- **Common Tools**: rbenv, nvm, pyenv, direnv

## 💡 Common Eval Patterns
- **Version Managers**: rbenv, nvm, pyenv, sdkman
- **Shell Initializers**: direnv, starship, thefuck
- **Development Tools**: docker, kubectl
- **Shell Utilities**: Various CLI tools

## ⚠️ Performance Note
Each eval command can add overhead to shell startup. Consider lazy loading or conditional initialization.
      `}
      omitValueMarkdown={true}
      generateMetadata={(evalItem) => (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Command"
            text={truncateValueMiddle(evalItem.command, 60)}
            icon={{ source: Icon.Code, tintColor: MODERN_COLORS.primary }}
          />
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={evalItem.section}
            icon={{
              source: Icon.Folder,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
          <List.Item.Detail.Metadata.Label title="Section Starts" text={`Line ${evalItem.sectionStartLine}`} />
          <List.Item.Detail.Metadata.Label title="File" text="~/.zshrc" icon={Icon.Document} />
        </List.Item.Detail.Metadata>
      )}
    />
  );
}
