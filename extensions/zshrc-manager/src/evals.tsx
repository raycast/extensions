import { Icon, List } from "@raycast/api";
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

/**
 * Evals management command for zshrc content
 */
export default function Evals() {
  return (
    <ListViewController<EvalItem>
      commandName="Evals"
      navigationTitle="Evals"
      searchPlaceholder="Search eval commands..."
      icon={Icon.Code}
      tintColor={MODERN_COLORS.warning}
      itemType="eval"
      itemTypePlural="evals"
      parser={parseEvals}
      searchFields={["command", "section"]}
      generateTitle={(evalItem) => truncateValueMiddle(evalItem.command)}
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
      generateItemMarkdown={(evalItem) => `
# Eval: \`${truncateValueMiddle(evalItem.command, 80)}\`

## ⚡ Eval Command
\`\`\`zsh
eval "${evalItem.command}"
\`\`\`

## 📍 Location
- **Section**: ${evalItem.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${evalItem.sectionStartLine}

## 💡 Eval Information
- **Purpose**: Dynamic code execution during shell initialization
- **Common Uses**: Tool initialization and version management

## 🔍 Common Eval Tools
- **rbenv**: \`eval "$(rbenv init -)"\`
- **nvm**: \`eval "$(nvm_command)"\`
- **pyenv**: \`eval "$(pyenv init -)"\`
- **direnv**: \`eval "$(direnv hook zsh)"\`

## ⚠️ Performance Impact
Eval commands execute during shell startup. Multiple evals can increase startup time. Consider lazy loading alternatives.
      `}
      generateMetadata={(evalItem) => (
        <>
          <List.Item.Detail.Metadata.Label
            title="Command"
            text={truncateValueMiddle(evalItem.command, 60)}
            icon={{
              source: Icon.Code,
              tintColor: MODERN_COLORS.warning,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={evalItem.section}
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
        </>
      )}
    />
  );
}
