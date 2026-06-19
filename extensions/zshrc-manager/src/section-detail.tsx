import type React from "react";
import type { ReactNode } from "react";
import { Detail, List, ActionPanel, Action, Icon } from "@raycast/api";
import type { LogicalSection } from "./lib/parse-zshrc";
import { MODERN_COLORS } from "./constants";
import { getZshrcPath } from "./lib/zsh";
import { parseSectionContent, applyContentFilter, generateSectionMarkdown } from "./utils/markdown";
import { AliasListItem, ExportListItem, OtherLineListItem } from "./components";

interface SectionDetailProps {
  /** The section to display */
  section: LogicalSection;
  /** Whether to show the component in a separate window */
  isSeparateWindow?: boolean;
  /** Custom actions to override default actions */
  actions?: ReactNode;
  /** Filter type to show only specific content */
  filterType?: "all" | "aliases" | "exports";
  /** Display mode for content formatting */
  displayMode?: "formatted" | "raw" | "compact";
}

/**
 * Detail view component for displaying a single logical section
 */
export function SectionDetail({
  section,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSeparateWindow = false,
  actions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filterType = "all",
  displayMode = "formatted",
}: SectionDetailProps) {
  const content = parseSectionContent(section);
  const markdownContent = generateSectionMarkdown(section, displayMode, content);

  return (
    <Detail
      navigationTitle={`${section.label} - Section Detail`}
      markdown={markdownContent}
      actions={
        actions || (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Section Content"
              content={section.content}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
            <Action.OpenWith title="Open with Editor" path={getZshrcPath()} />
            <Action.CopyToClipboard
              title="Copy Section Name"
              content={section.label}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        )
      }
    />
  );
}

interface SectionDetailListProps {
  /** The section to display */
  section: LogicalSection;
  /** Filter type to show only specific content */
  filterType?: "all" | "aliases" | "exports";
  /** Display mode for content formatting */
  displayMode?: "formatted" | "raw" | "compact";
  /** Custom actions to override default actions */
  actions?: ReactNode;
  /** Search bar accessory (dropdown) */
  searchBarAccessory?: React.ReactElement | null;
}

/**
 * List view component for displaying a single logical section with detailed items
 */
export function SectionDetailList({
  section,
  filterType = "all",
  displayMode = "formatted",
  actions,
  searchBarAccessory,
}: SectionDetailListProps) {
  const content = parseSectionContent(section);
  const filtered = applyContentFilter(content, filterType);
  const { aliases, exports, otherLines } = filtered;

  const hasAliases = aliases.length > 0;
  const hasExports = exports.length > 0;
  const hasOtherContent = otherLines.length > 0;

  // Shared handler for delete actions
  // Note: Delete operations are handled by the individual list item components
  // (AliasListItem, ExportListItem) through their own delete actions.
  // This callback is passed to enable child components to notify the parent
  // that a refresh may be needed, but currently the parent doesn't subscribe
  // to changes dynamically - users refresh manually with Cmd+R.
  const handleDelete = () => {
    // No-op: Parent component handles refresh via manual action
  };

  // Build content based on display mode
  const renderContent = () => {
    switch (displayMode) {
      case "raw":
        return (
          <List.Section title="Raw Content">
            <List.Item
              title="Raw Section Content"
              subtitle={`Lines ${section.startLine}-${section.endLine}`}
              icon={{ source: Icon.Document, tintColor: MODERN_COLORS.primary }}
              detail={
                <List.Item.Detail
                  markdown={`
# ${section.label} - Raw Content

\`\`\`zsh
${section.content}
\`\`\`
                  `}
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Section Content"
                    content={section.content}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        );

      case "compact":
        return (
          <>
            <List.Section title="Section Overview">
              <List.Item
                title={section.label}
                subtitle={`Lines ${section.startLine}-${section.endLine} | Aliases: ${aliases.length} | Exports: ${exports.length}`}
                icon={{
                  source: Icon.Document,
                  tintColor: MODERN_COLORS.primary,
                }}
                detail={
                  <List.Item.Detail
                    markdown={`
# ${section.label}

**Aliases:** ${hasAliases ? aliases.map((alias) => `\`${alias.name}\` → \`${alias.command}\``).join(" | ") : "None"}

**Exports:** ${hasExports ? exports.map((exp) => `\`${exp.variable}\` = \`${exp.value}\``).join(" | ") : "None"}

**Other Lines:** ${hasOtherContent ? otherLines.length : 0}
                    `}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Section Content"
                      content={section.content}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>

            {hasAliases && (
              <List.Section title="Aliases">
                {aliases.map((alias, index) => (
                  <AliasListItem
                    key={`alias-${alias.name}-${index}`}
                    alias={alias}
                    sectionLabel={section.label}
                    index={index}
                    onDelete={handleDelete}
                  />
                ))}
              </List.Section>
            )}

            {hasExports && (
              <List.Section title="Exports">
                {exports.map((exp, index) => (
                  <ExportListItem
                    key={`export-${exp.variable}-${index}`}
                    exportItem={exp}
                    sectionLabel={section.label}
                    index={index}
                    onDelete={handleDelete}
                  />
                ))}
              </List.Section>
            )}

            {hasOtherContent && (
              <List.Section title="Other Configuration">
                {otherLines.map((line, index) => {
                  // Calculate actual line number by finding position in original content
                  const sectionLines = section.content.split("\n");
                  const lineIndex = sectionLines.findIndex((l) => l === line);
                  const actualLineNumber = lineIndex >= 0 ? section.startLine + lineIndex : section.startLine + index;
                  return (
                    <OtherLineListItem
                      key={`other-${index}`}
                      line={line}
                      lineNumber={actualLineNumber}
                      sectionLabel={section.label}
                      index={index}
                    />
                  );
                })}
              </List.Section>
            )}
          </>
        );

      case "formatted":
      default:
        return (
          <>
            <List.Section title="Section Overview">
              <List.Item
                title={section.label}
                subtitle={`Lines ${section.startLine}-${section.endLine}`}
                icon={{
                  source: Icon.Document,
                  tintColor: MODERN_COLORS.primary,
                }}
                detail={
                  <List.Item.Detail
                    markdown={`
# ${section.label}

**Section Information:**
- **Start Line:** ${section.startLine}
- **End Line:** ${section.endLine}
- **Total Aliases:** ${aliases.length}
- **Total Exports:** ${exports.length}
- **Other Lines:** ${otherLines.length}

**Content Preview:**
\`\`\`zsh
${section.content.split("\n").slice(0, 10).join("\n")}${section.content.split("\n").length > 10 ? "\n..." : ""}
\`\`\`
                    `}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Section Content"
                      content={section.content}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>

            {hasAliases && (
              <List.Section title="Aliases">
                {aliases.map((alias, index) => (
                  <AliasListItem
                    key={`alias-${alias.name}-${index}`}
                    alias={alias}
                    sectionLabel={section.label}
                    index={index}
                    onDelete={handleDelete}
                  />
                ))}
              </List.Section>
            )}

            {hasExports && (
              <List.Section title="Exports">
                {exports.map((exp, index) => (
                  <ExportListItem
                    key={`export-${exp.variable}-${index}`}
                    exportItem={exp}
                    sectionLabel={section.label}
                    index={index}
                    onDelete={handleDelete}
                  />
                ))}
              </List.Section>
            )}

            {hasOtherContent && (
              <List.Section title="Other Configuration">
                {otherLines.map((line, index) => {
                  // Calculate actual line number by finding position in original content
                  const sectionLines = section.content.split("\n");
                  const lineIndex = sectionLines.findIndex((l) => l === line);
                  const actualLineNumber = lineIndex >= 0 ? section.startLine + lineIndex : section.startLine + index;
                  return (
                    <OtherLineListItem
                      key={`other-${index}`}
                      line={line}
                      lineNumber={actualLineNumber}
                      sectionLabel={section.label}
                      index={index}
                    />
                  );
                })}
              </List.Section>
            )}
          </>
        );
    }
  };

  return (
    <List
      navigationTitle={`${section.label} - Section Detail`}
      isShowingDetail={true}
      actions={actions}
      searchBarAccessory={searchBarAccessory as List.Props["searchBarAccessory"]}
    >
      {renderContent()}
    </List>
  );
}
