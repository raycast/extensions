import { Detail, List, ActionPanel, Action, Icon } from "@raycast/api";
import { LogicalSection } from "./lib/parse-zshrc";
import { MODERN_COLORS } from "./constants";
import { ReactNode, ReactElement } from "react";
import { getZshrcPath } from "./lib/zsh";
import EditAlias from "./edit-alias";
import EditExport from "./edit-export";
import { truncateValueMiddle } from "./utils/formatters";
import { parseSectionContent, applyContentFilter, generateSectionMarkdown } from "./utils/markdown";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchBarAccessory?: ReactElement<any> | null;
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
              <List.Section title="🖥️ Aliases">
                {aliases.map((alias, index) => (
                  <List.Item
                    key={`alias-${alias.name}-${index}`}
                    title={alias.name}
                    subtitle={truncateValueMiddle(alias.command, 60)}
                    icon={{
                      source: Icon.Terminal,
                      tintColor: MODERN_COLORS.success,
                    }}
                    detail={
                      <List.Item.Detail
                        markdown={`
# Alias: \`${alias.name}\`

**Command:** \`${alias.command}\`

**Full Definition:**
\`\`\`zsh
alias ${alias.name}='${alias.command}'
\`\`\`
                        `}
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Edit Alias"
                          target={
                            <EditAlias
                              existingName={alias.name}
                              existingCommand={alias.command}
                              sectionLabel={section.label}
                            />
                          }
                          icon={Icon.Pencil}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                        />
                        <Action.Push
                          title="View Alias Detail"
                          target={
                            <Detail
                              navigationTitle={`Alias: ${alias.name}`}
                              markdown={`
# Alias: \`${alias.name}\`

**Command:** \`${alias.command}\`

**Full Definition:**
\`\`\`zsh
alias ${alias.name}='${alias.command}'
\`\`\`

**Usage:**
Type \`${alias.name}\` in your terminal to execute: \`${alias.command}\`
                              `}
                              actions={
                                <ActionPanel>
                                  <Action.CopyToClipboard
                                    title="Copy Alias"
                                    content={`alias ${alias.name}='${alias.command}'`}
                                  />
                                  <Action.CopyToClipboard title="Copy Command Only" content={alias.command} />
                                  <Action.CopyToClipboard title="Copy Name Only" content={alias.name} />
                                </ActionPanel>
                              }
                            />
                          }
                          icon={Icon.Eye}
                        />
                        <Action.CopyToClipboard
                          title="Copy Alias"
                          content={`alias ${alias.name}='${alias.command}'`}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Command Only"
                          content={alias.command}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Name Only"
                          content={alias.name}
                          shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            )}

            {hasExports && (
              <List.Section title="📦 Exports">
                {exports.map((exp, index) => (
                  <List.Item
                    key={`export-${exp.variable}-${index}`}
                    title={exp.variable}
                    subtitle={truncateValueMiddle(exp.value, 60)}
                    icon={{
                      source: Icon.Box,
                      tintColor: MODERN_COLORS.primary,
                    }}
                    detail={
                      <List.Item.Detail
                        markdown={`
# Export: \`${exp.variable}\`

**Value:** \`${exp.value}\`

**Full Definition:**
\`\`\`zsh
export ${exp.variable}=${exp.value}
\`\`\`
                        `}
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Edit Export"
                          target={
                            <EditExport
                              existingVariable={exp.variable}
                              existingValue={exp.value}
                              sectionLabel={section.label}
                            />
                          }
                          icon={Icon.Pencil}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                        />
                        <Action.Push
                          title="View Export Detail"
                          target={
                            <Detail
                              navigationTitle={`Export: ${exp.variable}`}
                              markdown={`
# Export: \`${exp.variable}\`

**Value:** \`${exp.value}\`

**Full Definition:**
\`\`\`zsh
export ${exp.variable}=${exp.value}
\`\`\`

**Usage:**
This environment variable will be available to all child processes.
                              `}
                              actions={
                                <ActionPanel>
                                  <Action.CopyToClipboard
                                    title="Copy Export"
                                    content={`export ${exp.variable}=${exp.value}`}
                                  />
                                  <Action.CopyToClipboard title="Copy Value Only" content={exp.value} />
                                  <Action.CopyToClipboard title="Copy Variable Only" content={exp.variable} />
                                </ActionPanel>
                              }
                            />
                          }
                          icon={Icon.Eye}
                        />
                        <Action.CopyToClipboard
                          title="Copy Export"
                          content={`export ${exp.variable}=${exp.value}`}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Value Only"
                          content={exp.value}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Variable Only"
                          content={exp.variable}
                          shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            )}

            {hasOtherContent && (
              <List.Section title="⚙️ Other Configuration">
                {otherLines.map((line, index) => (
                  <List.Item
                    key={`other-${index}`}
                    title={truncateValueMiddle(line, 80)}
                    icon={{
                      source: Icon.Code,
                      tintColor: MODERN_COLORS.neutral,
                    }}
                    detail={
                      <List.Item.Detail
                        markdown={`
# Configuration Line ${section.startLine + index}

**Content:**
\`\`\`zsh
${line}
\`\`\`

**Context:**
This line is part of the "${section.label}" section in your zshrc file.
                        `}
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Line Detail"
                          target={
                            <Detail
                              navigationTitle={`Line ${section.startLine + index}`}
                              markdown={`
# Configuration Line ${section.startLine + index}

**Content:**
\`\`\`zsh
${line}
\`\`\`

**Context:**
This line is part of the "${section.label}" section in your zshrc file.
                              `}
                              actions={
                                <ActionPanel>
                                  <Action.CopyToClipboard title="Copy Line" content={line} />
                                </ActionPanel>
                              }
                            />
                          }
                          icon={Icon.Eye}
                        />
                        <Action.CopyToClipboard
                          title="Copy Line"
                          content={line}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
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
              <List.Section title="🖥️ Aliases">
                {aliases.map((alias, index) => (
                  <List.Item
                    key={`alias-${alias.name}-${index}`}
                    title={alias.name}
                    subtitle={truncateValueMiddle(alias.command, 60)}
                    icon={{
                      source: Icon.Terminal,
                      tintColor: MODERN_COLORS.success,
                    }}
                    detail={
                      <List.Item.Detail
                        markdown={`
# Alias: \`${alias.name}\`

**Command:** \`${alias.command}\`

**Full Definition:**
\`\`\`zsh
alias ${alias.name}='${alias.command}'
\`\`\`
                        `}
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Edit Alias"
                          target={
                            <EditAlias
                              existingName={alias.name}
                              existingCommand={alias.command}
                              sectionLabel={section.label}
                            />
                          }
                          icon={Icon.Pencil}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                        />
                        <Action.Push
                          title="View Alias Detail"
                          target={
                            <Detail
                              navigationTitle={`Alias: ${alias.name}`}
                              markdown={`
# Alias: \`${alias.name}\`

**Command:** \`${alias.command}\`

**Full Definition:**
\`\`\`zsh
alias ${alias.name}='${alias.command}'
\`\`\`

**Usage:**
Type \`${alias.name}\` in your terminal to execute: \`${alias.command}\`
                              `}
                              actions={
                                <ActionPanel>
                                  <Action.CopyToClipboard
                                    title="Copy Alias"
                                    content={`alias ${alias.name}='${alias.command}'`}
                                  />
                                  <Action.CopyToClipboard title="Copy Command Only" content={alias.command} />
                                  <Action.CopyToClipboard title="Copy Name Only" content={alias.name} />
                                </ActionPanel>
                              }
                            />
                          }
                          icon={Icon.Eye}
                        />
                        <Action.CopyToClipboard
                          title="Copy Alias"
                          content={`alias ${alias.name}='${alias.command}'`}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Command Only"
                          content={alias.command}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Name Only"
                          content={alias.name}
                          shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            )}

            {hasExports && (
              <List.Section title="📦 Exports">
                {exports.map((exp, index) => (
                  <List.Item
                    key={`export-${exp.variable}-${index}`}
                    title={exp.variable}
                    subtitle={truncateValueMiddle(exp.value, 60)}
                    icon={{
                      source: Icon.Box,
                      tintColor: MODERN_COLORS.primary,
                    }}
                    detail={
                      <List.Item.Detail
                        markdown={`
# Export: \`${exp.variable}\`

**Value:** \`${exp.value}\`

**Full Definition:**
\`\`\`zsh
export ${exp.variable}=${exp.value}
\`\`\`
                        `}
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Edit Export"
                          target={
                            <EditExport
                              existingVariable={exp.variable}
                              existingValue={exp.value}
                              sectionLabel={section.label}
                            />
                          }
                          icon={Icon.Pencil}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                        />
                        <Action.Push
                          title="View Export Detail"
                          target={
                            <Detail
                              navigationTitle={`Export: ${exp.variable}`}
                              markdown={`
# Export: \`${exp.variable}\`

**Value:** \`${exp.value}\`

**Full Definition:**
\`\`\`zsh
export ${exp.variable}=${exp.value}
\`\`\`

**Usage:**
This environment variable will be available to all child processes.
                              `}
                              actions={
                                <ActionPanel>
                                  <Action.CopyToClipboard
                                    title="Copy Export"
                                    content={`export ${exp.variable}=${exp.value}`}
                                  />
                                  <Action.CopyToClipboard title="Copy Value Only" content={exp.value} />
                                  <Action.CopyToClipboard title="Copy Variable Only" content={exp.variable} />
                                </ActionPanel>
                              }
                            />
                          }
                          icon={Icon.Eye}
                        />
                        <Action.CopyToClipboard
                          title="Copy Export"
                          content={`export ${exp.variable}=${exp.value}`}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Value Only"
                          content={exp.value}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Variable Only"
                          content={exp.variable}
                          shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            )}

            {hasOtherContent && (
              <List.Section title="⚙️ Other Configuration">
                {otherLines.map((line, index) => (
                  <List.Item
                    key={`other-${index}`}
                    title={truncateValueMiddle(line, 80)}
                    icon={{
                      source: Icon.Code,
                      tintColor: MODERN_COLORS.neutral,
                    }}
                    detail={
                      <List.Item.Detail
                        markdown={`
# Configuration Line ${section.startLine + index}

**Content:**
\`\`\`zsh
${line}
\`\`\`

**Context:**
This line is part of the "${section.label}" section in your zshrc file.
                        `}
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Line Detail"
                          target={
                            <Detail
                              navigationTitle={`Line ${section.startLine + index}`}
                              markdown={`
# Configuration Line ${section.startLine + index}

**Content:**
\`\`\`zsh
${line}
\`\`\`

**Context:**
This line is part of the "${section.label}" section in your zshrc file.
                              `}
                              actions={
                                <ActionPanel>
                                  <Action.CopyToClipboard title="Copy Line" content={line} />
                                </ActionPanel>
                              }
                            />
                          }
                          icon={Icon.Eye}
                        />
                        <Action.CopyToClipboard
                          title="Copy Line"
                          content={line}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
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
      searchBarAccessory={searchBarAccessory}
    >
      {renderContent()}
    </List>
  );
}
