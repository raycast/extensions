import {
  Action,
  ActionPanel,
  List,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readZshrcFile, ZSHRC_PATH } from "./lib/zsh";
import { LogicalSection, toLogicalSections } from "./lib/parse-zshrc";
import { MODERN_COLORS } from "./constants";
import { getSectionIcon } from "./lib/section-icons";
import { SectionDetail } from "./section-detail";

/**
 * Sections management command for zshrc content
 */
export default function Sections() {
  const [sections, setSections] = useState<LogicalSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadSections = async () => {
    try {
      const content = await readZshrcFile();
      const parsedSections = toLogicalSections(content);
      setSections([...parsedSections]);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Loading Sections",
        message:
          error instanceof Error ? error.message : "Failed to load zshrc file",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    loadSections();
  };

  const filteredSections = sections.filter((section) =>
    section.label.toLowerCase().includes(searchText.toLowerCase()),
  );

  const labeledSections = filteredSections.filter(
    (section) => section.label !== "Unlabeled",
  );
  const unlabeledSections = filteredSections.filter(
    (section) => section.label === "Unlabeled",
  );

  return (
    <List
      navigationTitle="Sections"
      searchBarPlaceholder="Search sections..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={true}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={handleRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.Open
            title="Open ~/.Zshrc"
            target={ZSHRC_PATH}
            icon={Icon.Document}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Overview">
        <List.Item
          title="Section Summary"
          subtitle={`${sections.length} total sections (${labeledSections.length} labeled, ${unlabeledSections.length} unlabeled)`}
          icon={{ source: Icon.Folder, tintColor: MODERN_COLORS.primary }}
          detail={
            <List.Item.Detail
              markdown={`
# Section Summary

Your \`.zshrc\` file is organized into **${sections.length} sections**:

## 📁 Section Breakdown
- **Labeled Sections**: ${labeledSections.length} organized blocks with clear names
- **Unlabeled Sections**: ${unlabeledSections.length} miscellaneous configuration blocks

## 🎯 Section Management
Each section contains related configuration:
- Aliases, exports, functions, and other zsh constructs
- Organized by functionality or purpose
- Easy to navigate and manage

## 💡 Tips
- Labeled sections are easier to manage and understand
- Consider adding labels to unlabeled sections for better organization
- Use consistent naming conventions for section headers
              `}
            />
          }
          actions={
            <ActionPanel>
              <Action.Open
                title="Open ~/.Zshrc"
                target={ZSHRC_PATH}
                icon={Icon.Document}
              />
              <Action
                title="Refresh Sections"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {labeledSections.length > 0 && (
        <List.Section title="Labeled Sections">
          {labeledSections.map((section) => {
            const sectionIcon = getSectionIcon(section.label);
            const totalEntries =
              section.aliasCount +
              section.exportCount +
              section.functionCount +
              section.pluginCount +
              section.sourceCount +
              section.evalCount +
              section.setoptCount +
              section.autoloadCount +
              section.fpathCount +
              section.pathCount +
              section.themeCount +
              section.completionCount +
              section.historyCount +
              section.keybindingCount +
              section.otherCount;

            return (
              <List.Item
                key={section.label}
                title={section.label}
                icon={{
                  source: sectionIcon.icon,
                  tintColor: sectionIcon.color,
                }}
                accessories={[
                  ...(section.aliasCount > 0
                    ? [
                        {
                          icon: {
                            source: Icon.Terminal,
                            tintColor: MODERN_COLORS.success,
                          },
                          text: `${section.aliasCount}`,
                        },
                      ]
                    : []),
                  ...(section.exportCount > 0
                    ? [
                        {
                          icon: {
                            source: Icon.Box,
                            tintColor: MODERN_COLORS.primary,
                          },
                        },
                        { text: `${section.exportCount}` },
                      ]
                    : []),
                  ...(section.functionCount > 0
                    ? [
                        {
                          icon: {
                            source: Icon.Code,
                            tintColor: MODERN_COLORS.primary,
                          },
                        },
                        { text: `${section.functionCount}` },
                      ]
                    : []),
                  ...(section.pluginCount > 0
                    ? [
                        {
                          icon: {
                            source: Icon.Box,
                            tintColor: MODERN_COLORS.warning,
                          },
                        },
                        { text: `${section.pluginCount}` },
                      ]
                    : []),
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`
# ${section.label}

**Lines:** ${section.startLine}-${section.endLine} | **Total Entries:** ${totalEntries}

## 📊 Entry Breakdown
- **Aliases**: ${section.aliasCount}
- **Exports**: ${section.exportCount}
- **Functions**: ${section.functionCount}
- **Plugins**: ${section.pluginCount}
- **Sources**: ${section.sourceCount}
- **Evals**: ${section.evalCount}
- **Setopts**: ${section.setoptCount}
- **Other**: ${section.otherCount}

## 📋 Content Preview
\`\`\`zsh
${section.content.split("\n").slice(0, 10).join("\n")}${section.content.split("\n").length > 10 ? "\n..." : ""}
\`\`\`
                    `}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Section Details"
                      target={<SectionDetail section={section} />}
                      icon={Icon.Eye}
                    />
                    <Action.Open
                      title="Open ~/.Zshrc"
                      target={ZSHRC_PATH}
                      icon={Icon.Document}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={handleRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {unlabeledSections.length > 0 && (
        <List.Section title="Unlabeled Sections">
          {unlabeledSections.map((section, index) => {
            const sectionIcon = getSectionIcon(section.label);
            const totalEntries =
              section.aliasCount +
              section.exportCount +
              section.functionCount +
              section.pluginCount +
              section.sourceCount +
              section.evalCount +
              section.setoptCount +
              section.autoloadCount +
              section.fpathCount +
              section.pathCount +
              section.themeCount +
              section.completionCount +
              section.historyCount +
              section.keybindingCount +
              section.otherCount;

            return (
              <List.Item
                key={`unlabeled-${index}`}
                title={`Unlabeled Section ${index + 1}`}
                icon={{
                  source: sectionIcon.icon,
                  tintColor: sectionIcon.color,
                }}
                accessories={[
                  ...(section.aliasCount > 0
                    ? [
                        {
                          icon: {
                            source: Icon.Terminal,
                            tintColor: MODERN_COLORS.success,
                          },
                          text: `${section.aliasCount}`,
                        },
                      ]
                    : []),
                  ...(section.exportCount > 0
                    ? [
                        {
                          icon: {
                            source: Icon.Box,
                            tintColor: MODERN_COLORS.primary,
                          },
                        },
                        { text: `${section.exportCount}` },
                      ]
                    : []),
                  ...(section.functionCount > 0
                    ? [
                        {
                          icon: {
                            source: Icon.Code,
                            tintColor: MODERN_COLORS.primary,
                          },
                        },
                        { text: `${section.functionCount}` },
                      ]
                    : []),
                  ...(section.pluginCount > 0
                    ? [
                        {
                          icon: {
                            source: Icon.Box,
                            tintColor: MODERN_COLORS.warning,
                          },
                        },
                        { text: `${section.pluginCount}` },
                      ]
                    : []),
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`
# Unlabeled Section ${index + 1}

**Lines:** ${section.startLine}-${section.endLine} | **Total Entries:** ${totalEntries}

## ⚠️ Unlabeled Section
This section doesn't have a descriptive label. Consider adding a section header like:
\`# --- Section Name --- #\`

## 📊 Entry Breakdown
- **Aliases**: ${section.aliasCount}
- **Exports**: ${section.exportCount}
- **Functions**: ${section.functionCount}
- **Plugins**: ${section.pluginCount}
- **Sources**: ${section.sourceCount}
- **Evals**: ${section.evalCount}
- **Setopts**: ${section.setoptCount}
- **Other**: ${section.otherCount}

## 📋 Content Preview
\`\`\`zsh
${section.content.split("\n").slice(0, 10).join("\n")}${section.content.split("\n").length > 10 ? "\n..." : ""}
\`\`\`
                    `}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Section Details"
                      target={<SectionDetail section={section} />}
                      icon={Icon.Eye}
                    />
                    <Action.Open
                      title="Open ~/.Zshrc"
                      target={ZSHRC_PATH}
                      icon={Icon.Document}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={handleRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
