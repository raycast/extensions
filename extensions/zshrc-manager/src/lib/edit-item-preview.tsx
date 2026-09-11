/**
 * Diff preview for the edit form.
 *
 * Derives the proposed content from the same pure computation the save
 * path uses (`computeUpdatedContent`), so the preview always shows
 * exactly what a save would write.
 */

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { computeDiff } from "../utils/diff";
import { computeUpdatedContent, type EditItemConfig } from "./edit-item-write";
import { readZshrcFileRaw } from "./zsh";

/**
 * Props for DiffPreviewView
 */
export interface DiffPreviewViewProps {
  existingKey?: string | undefined;
  sectionOccurrence?: number | undefined;
  currentKey: string;
  currentValue: string;
  currentSection: string;
  newSectionName: string;
  originalSection?: string | undefined;
  config: EditItemConfig;
  isEditing: boolean;
}

/**
 * Diff preview view component
 * Shows the diff between current file and proposed changes
 */
export function DiffPreviewView({
  existingKey,
  sectionOccurrence,
  currentKey,
  currentValue,
  currentSection,
  newSectionName,
  originalSection,
  config,
  isEditing,
}: DiffPreviewViewProps) {
  const [diffMarkdown, setDiffMarkdown] = useState<string>("Loading preview...");
  const [isLoading, setIsLoading] = useState(true);

  const generatePreview = useCallback(async () => {
    setIsLoading(true);
    try {
      const key = currentKey.trim();
      const value = currentValue.trim();

      if (!key || !value) {
        setDiffMarkdown(`
# Preview Not Available

Please fill in both the ${config.keyLabel.toLowerCase()} and ${config.valueLabel.toLowerCase()} fields to preview changes.
        `);
        return;
      }

      // Determine target section
      let targetSection = currentSection;
      if (currentSection === "New Section") {
        if (!newSectionName.trim()) {
          setDiffMarkdown(`
# Preview Not Available

Please provide a name for the new section to preview changes.
          `);
          return;
        }
        targetSection = newSectionName.trim();
      }

      const zshrcContent = await readZshrcFileRaw();
      const modifiedContent = computeUpdatedContent(zshrcContent, {
        config,
        key,
        value,
        targetSection,
        isEditing,
        existingKey,
        originalSection,
        sectionOccurrence,
      });

      // Compute the diff
      const diff = computeDiff(zshrcContent, modifiedContent);

      if (!diff.hasChanges) {
        setDiffMarkdown(`
# No Changes

The current values would not change your zshrc file.
        `);
      } else {
        setDiffMarkdown(`
# Preview: ${isEditing ? `Update ${config.itemTypeCapitalized}` : `Add ${config.itemTypeCapitalized}`}

${diff.markdown}

---

*This preview shows what will change when you save. Lines prefixed with \`-\` will be removed, lines with \`+\` will be added.*
        `);
      }
    } catch (error) {
      setDiffMarkdown(`
# Error Generating Preview

${error instanceof Error ? error.message : "Unknown error occurred"}
      `);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentKey,
    currentValue,
    currentSection,
    newSectionName,
    originalSection,
    existingKey,
    sectionOccurrence,
    config,
    isEditing,
  ]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  return (
    <Detail
      navigationTitle="Preview Changes"
      isLoading={isLoading}
      markdown={diffMarkdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Preview" icon={Icon.ArrowClockwise} onAction={generatePreview} />
          <Action.CopyToClipboard
            title="Copy Diff"
            content={diffMarkdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
