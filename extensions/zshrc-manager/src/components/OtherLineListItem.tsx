import React from "react";
import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { truncateValueMiddle } from "../utils/formatters";

interface OtherLineListItemProps {
  line: string;
  lineNumber: number;
  sectionLabel: string;
  index: number;
}

/**
 * Escapes triple backticks in content to prevent markdown code block issues
 */
function escapeBackticks(content: string): string {
  return content.replace(/```/g, "\\`\\`\\`");
}

/**
 * Reusable other content list item component with detail view and actions
 */
export function OtherLineListItem({ line, lineNumber, sectionLabel, index }: OtherLineListItemProps) {
  const escapedLine = escapeBackticks(line);
  return (
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
# Configuration Line ${lineNumber}

**Content:**
\`\`\`zsh
${escapedLine}
\`\`\`

**Context:**
This line is part of the "${sectionLabel}" section in your zshrc file.
          `}
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="View Line Detail"
            target={
              <Detail
                navigationTitle={`Line ${lineNumber}`}
                markdown={`
# Configuration Line ${lineNumber}

**Content:**
\`\`\`zsh
${escapedLine}
\`\`\`

**Context:**
This line is part of the "${sectionLabel}" section in your zshrc file.
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
          <Action.CopyToClipboard title="Copy Line" content={line} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}
