import type { ReactNode } from "react";
import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import type { LogicalSection } from "./lib/parse-zshrc";
import { getZshrcPath } from "./lib/zsh";
import { parseSectionContent, generateSectionMarkdown } from "./utils/markdown";

interface SectionDetailProps {
  /** The section to display */
  section: LogicalSection;
  /** Custom actions to override default actions */
  actions?: ReactNode;
  /** Display mode for content formatting */
  displayMode?: "formatted" | "raw" | "compact";
}

/**
 * Detail view component for displaying a single logical section.
 *
 * Rendered markdown masks secret export values (see `generateSectionMarkdown`);
 * "Copy Section Content" deliberately copies the real file content.
 */
export function SectionDetail({ section, actions, displayMode = "formatted" }: SectionDetailProps) {
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
