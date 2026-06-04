import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Detail,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { readZshrcFileRaw, writeZshrcFile, checkZshrcAccess, getZshrcPath, readZshrcFile } from "./zsh";
import { findSectionBounds } from "./section-detector";
import { clearCache } from "./cache";
import { toLogicalSections } from "./parse-zshrc";
import { saveToHistory } from "./history";
import { log } from "../utils/logger";
import { computeDiff } from "../utils/diff";
import { validateStructure } from "../utils/validation";

/**
 * Configuration for EditItemForm component
 */
export interface EditItemConfig {
  /** Label for the key field (e.g., "Alias Name" or "Variable Name") */
  keyLabel: string;
  /** Label for the value field (e.g., "Command" or "Value") */
  valueLabel: string;
  /** Placeholder for key field */
  keyPlaceholder: string;
  /** Placeholder for value field */
  valuePlaceholder: string;
  /** Validation regex for key field */
  keyPattern: RegExp;
  /** Validation error message for key field */
  keyValidationError: string;
  /** Function to generate the line to insert */
  generateLine: (key: string, value: string) => string;
  /** Function to generate regex pattern for finding existing item */
  generatePattern: (key: string) => RegExp;
  /** Function to generate replacement line for update */
  generateReplacement: (key: string, value: string) => string;
  /** Item type name for messages (e.g., "alias" or "export") */
  itemType: string;
  /** Item type capitalized for titles (e.g., "Alias" or "Export") */
  itemTypeCapitalized: string;
}

interface EditItemFormProps {
  /** Existing key value (for editing) */
  existingKey?: string | undefined;
  /** Existing value (for editing) */
  existingValue?: string | undefined;
  /** Section where this item belongs */
  sectionLabel?: string | undefined;
  /** Callback when item is saved */
  onSave?: (() => void) | undefined;
  /** Configuration for the form */
  config: EditItemConfig;
}

/**
 * Generic form component for creating or editing zshrc items (aliases, exports, etc.)
 *
 * This component provides a reusable form interface for managing zshrc configuration items.
 * It handles both creation and editing of items, with support for:
 * - Section-based organization
 * - Validation of key/value pairs
 * - Atomic file writes with verification
 * - Section creation and item movement
 *
 * @param existingKey - Existing key value (for editing mode)
 * @param existingValue - Existing value (for editing mode)
 * @param sectionLabel - Section where this item belongs
 * @param onSave - Callback invoked after successful save
 * @param config - Configuration object defining item-specific behavior
 */
export default function EditItemForm({ existingKey, existingValue, sectionLabel, onSave, config }: EditItemFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!existingKey;
  // Initialize sections with sectionLabel if it exists to avoid dropdown value mismatch
  const [sections, setSections] = useState<string[]>(sectionLabel ? [sectionLabel] : []);
  const [isLoadingSections, setIsLoadingSections] = useState(true);

  // Load sections for dropdown
  useEffect(() => {
    const loadSections = async () => {
      try {
        const content = await readZshrcFile();
        const logicalSections = toLogicalSections(content);
        const sectionNames = logicalSections.map((s) => s.label).filter((name) => name !== "Unlabeled");
        const uniqueSections = Array.from(new Set(sectionNames));

        // If editing and sectionLabel exists but isn't in the detected sections, add it
        // This handles cases where a section exists but wasn't detected properly
        if (sectionLabel && !uniqueSections.includes(sectionLabel)) {
          uniqueSections.push(sectionLabel);
        }

        setSections(uniqueSections.sort());
      } catch {
        // If loading fails, continue with empty sections
        // Still add sectionLabel if it exists
        if (sectionLabel) {
          setSections([sectionLabel]);
        }
      } finally {
        setIsLoadingSections(false);
      }
    };
    loadSections();
  }, [sectionLabel]);

  const { itemProps, handleSubmit } = useForm({
    initialValues: {
      key: existingKey || "",
      value: existingValue || "",
      section: sectionLabel || "Uncategorized",
      newSectionName: "",
    },
    onSubmit: async (values) => {
      const key = values.key?.trim() || "";
      const value = values.value?.trim() || "";
      const selectedSection = values.section?.trim() || "Uncategorized";
      const newSectionName = values.newSectionName?.trim() || "";

      if (!key || !value) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: `Both ${config.keyLabel.toLowerCase()} and ${config.valueLabel.toLowerCase()} are required`,
        });
        return;
      }

      // Validate structural integrity
      const validation = validateStructure(value);
      if (validation.warnings.length > 0) {
        const confirmed = await confirmAlert({
          title: "Structural Warnings Detected",
          message: `The following potential issues were found:\n\n${validation.warnings.map((w) => `• ${w}`).join("\n")}\n\nDo you want to save anyway?`,
          primaryAction: {
            title: "Save Anyway",
            style: Alert.ActionStyle.Default,
          },
          dismissAction: {
            title: "Cancel",
          },
        });

        if (!confirmed) {
          return;
        }
      }

      // Determine the actual section to use
      let targetSection: string;
      if (selectedSection === "New Section") {
        if (!newSectionName) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation Error",
            message: "Please provide a name for the new section",
          });
          return;
        }
        targetSection = newSectionName;
      } else {
        targetSection = selectedSection;
      }

      try {
        const zshrcContent = await readZshrcFileRaw();

        if (isEditing) {
          // Check if section changed
          const sectionChanged = sectionLabel !== targetSection;

          if (sectionChanged) {
            // Moving to a different section - remove from old location and add to new
            const pattern = config.generatePattern(existingKey!);
            const match = zshrcContent.match(pattern);

            if (!match || match.length === 0) {
              throw new Error(`${config.itemTypeCapitalized} "${existingKey}" not found in zshrc`);
            }

            // Create a non-global version to replace only first match
            const nonGlobalPattern = new RegExp(pattern.source, pattern.flags.replace("g", ""));

            // Remove the old line
            let updatedContent = zshrcContent.replace(nonGlobalPattern, () => "");

            // Clean up empty lines left behind
            updatedContent = updatedContent.replace(/\n\n\n+/g, "\n\n");

            // Generate the new line
            const itemLine = config.generateLine(key, value);

            // Find the target section to add to
            const targetSectionBounds = findSectionBounds(updatedContent, targetSection);

            if (targetSectionBounds) {
              // Found target section - add to it
              const lines = updatedContent.split(/\r?\n/);
              let insertLineIndex = targetSectionBounds.endLine - 1;

              // Find the last non-empty line in the section
              for (let i = targetSectionBounds.endLine - 1; i >= targetSectionBounds.startLine - 1; i--) {
                const line = lines[i];
                if (line && line.trim().length > 0) {
                  insertLineIndex = i;
                  break;
                }
              }

              const beforeLines = lines.slice(0, insertLineIndex + 1);
              const afterLines = lines.slice(insertLineIndex + 1);

              const beforeSection = beforeLines.join("\n");
              const afterSection = afterLines.join("\n");

              if (afterSection) {
                updatedContent = `${beforeSection}\n${itemLine}\n${afterSection}`;
              } else {
                updatedContent = `${beforeSection}\n${itemLine}`;
              }
            } else {
              // Target section not found - create it at the end
              updatedContent = `${updatedContent}\n\n# --- ${targetSection} --- #\n${itemLine}`;
            }

            log.edit.info(`Updating ${config.itemType} "${key}" and moving to section "${targetSection}"`);
            await writeZshrcFile(updatedContent);
            clearCache(getZshrcPath());
            const verify = await readZshrcFileRaw();
            if (verify !== updatedContent) {
              log.edit.error(`Write verification failed for ${config.itemType} "${key}"`);
              throw new Error("Write verification failed: content mismatch after save");
            }
            // Save to history only after successful write verification
            await saveToHistory(`Update ${config.itemType} "${key}" (move to ${targetSection})`);
            log.edit.info(`Successfully updated ${config.itemType} "${key}"`);

            await showToast({
              style: Toast.Style.Success,
              title: `${config.itemTypeCapitalized} Updated`,
              message: `Updated ${config.itemType} "${key}" and moved to "${targetSection}"`,
            });
          } else {
            // Same section - just update the line in place
            const pattern = config.generatePattern(existingKey!);
            const match = zshrcContent.match(pattern);

            if (!match || match.length === 0) {
              throw new Error(`${config.itemTypeCapitalized} "${existingKey}" not found in zshrc`);
            }

            // Create a non-global version of the pattern to replace only first match
            const nonGlobalPattern = new RegExp(pattern.source, pattern.flags.replace("g", ""));

            // Use replace with a function to preserve whitespace
            const updatedContent = zshrcContent.replace(nonGlobalPattern, (matchedLine) => {
              // Extract leading whitespace from the original line
              const leadingWhitespace = matchedLine.match(/^(\s*)/)?.[1] || "";
              // Generate replacement and preserve whitespace
              const replacement = config.generateReplacement(key, value);
              return `${leadingWhitespace}${replacement.trimStart()}`;
            });
            log.edit.info(`Updating ${config.itemType} "${key}" in place`);
            await writeZshrcFile(updatedContent);
            clearCache(getZshrcPath());
            // Verify write by re-reading and comparing
            const verify = await readZshrcFileRaw();
            if (verify !== updatedContent) {
              log.edit.error(`Write verification failed for ${config.itemType} "${key}"`);
              throw new Error("Write verification failed: content mismatch after save");
            }
            // Save to history only after successful write verification
            await saveToHistory(`Update ${config.itemType} "${key}"`);
            log.edit.info(`Successfully updated ${config.itemType} "${key}"`);

            await showToast({
              style: Toast.Style.Success,
              title: `${config.itemTypeCapitalized} Updated`,
              message: `Updated ${config.itemType} "${key}"`,
            });
          }
        } else {
          // Add new item
          const itemLine = config.generateLine(key, value);

          // Find the section to add the item to
          let updatedContent = zshrcContent;

          // Find the section using all supported formats
          const sectionBounds = findSectionBounds(zshrcContent, targetSection);

          if (sectionBounds) {
            // Found existing section - add to it
            // Find the last non-empty line before the section end
            const lines = zshrcContent.split(/\r?\n/);
            let insertLineIndex = sectionBounds.endLine - 1;

            // Find the last non-empty line in the section
            for (let i = sectionBounds.endLine - 1; i >= sectionBounds.startLine - 1; i--) {
              const line = lines[i];
              if (line && line.trim().length > 0) {
                insertLineIndex = i;
                break;
              }
            }

            // Rebuild content with the new item inserted after the last non-empty line
            const beforeLines = lines.slice(0, insertLineIndex + 1);
            const afterLines = lines.slice(insertLineIndex + 1);

            // Join with original line endings preserved
            const beforeSection = beforeLines.join("\n");
            const afterSection = afterLines.join("\n");

            // Insert the new item with proper spacing
            if (afterSection) {
              updatedContent = `${beforeSection}\n${itemLine}\n${afterSection}`;
            } else {
              // End of file - add without trailing newline
              updatedContent = `${beforeSection}\n${itemLine}`;
            }
          } else {
            // Section not found - create a new section at the end of the file
            // Use a simple format that's commonly supported
            updatedContent = `${zshrcContent}\n\n# --- ${targetSection} --- #\n${itemLine}`;
          }

          log.edit.info(`Adding new ${config.itemType} "${key}" to section "${targetSection}"`);
          await writeZshrcFile(updatedContent);
          clearCache(getZshrcPath());
          const verify = await readZshrcFileRaw();
          if (verify !== updatedContent) {
            log.edit.error(`Write verification failed for new ${config.itemType} "${key}"`);
            throw new Error("Write verification failed: content mismatch after save");
          }
          // Save to history only after successful write verification
          await saveToHistory(`Add ${config.itemType} "${key}"`);
          log.edit.info(`Successfully added ${config.itemType} "${key}"`);

          await showToast({
            style: Toast.Style.Success,
            title: `${config.itemTypeCapitalized} Added`,
            message: `Added ${config.itemType} "${key}"`,
          });
        }

        onSave?.();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : `Failed to save ${config.itemType}`,
        });
      }
    },
    validation: {
      key: (value) => {
        if (!value?.trim()) return `${config.keyLabel} is required`;
        if (!config.keyPattern.test(value.trim())) {
          return config.keyValidationError;
        }
        return undefined;
      },
      value: (value) => {
        if (!value?.trim()) return `${config.valueLabel} is required`;
        return undefined;
      },
    },
  });

  const handleDelete = async () => {
    if (!isEditing || !existingKey) return;

    try {
      const zshrcContent = await readZshrcFileRaw();
      const pattern = config.generatePattern(existingKey);
      const match = zshrcContent.match(pattern);

      if (!match || match.length === 0) {
        throw new Error(`${config.itemTypeCapitalized} "${existingKey}" not found in zshrc`);
      }

      // Create a non-global version to replace only first match
      const nonGlobalPattern = new RegExp(pattern.source, pattern.flags.replace("g", ""));

      // Replace only the first match with empty string
      const updatedContent = zshrcContent.replace(nonGlobalPattern, () => {
        // Remove the line entirely
        return "";
      });
      log.edit.info(`Deleting ${config.itemType} "${existingKey}"`);
      await saveToHistory(`Delete ${config.itemType} "${existingKey}"`);
      await writeZshrcFile(updatedContent);
      clearCache(getZshrcPath());
      const verify = await readZshrcFileRaw();
      if (verify !== updatedContent) {
        log.edit.error(`Write verification failed for delete of ${config.itemType} "${existingKey}"`);
        throw new Error("Write verification failed: content mismatch after delete");
      }
      log.edit.info(`Successfully deleted ${config.itemType} "${existingKey}"`);

      await showToast({
        style: Toast.Style.Success,
        title: `${config.itemTypeCapitalized} Deleted`,
        message: `Deleted ${config.itemType} "${existingKey}"`,
      });

      onSave?.();
      pop();
    } catch (error) {
      log.edit.error(`Failed to delete ${config.itemType}`, error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : `Failed to delete ${config.itemType}`,
      });
    }
  };

  return (
    <Form
      navigationTitle={
        isEditing ? `Edit ${config.itemTypeCapitalized}: ${existingKey}` : `Add New ${config.itemTypeCapitalized}`
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? `Update ${config.itemTypeCapitalized}` : `Add ${config.itemTypeCapitalized}`}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          {isEditing && (
            <Action
              title={`Delete ${config.itemTypeCapitalized}`}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
            />
          )}
          <Action.Push
            title="Preview Changes"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            target={
              <DiffPreviewView
                existingKey={existingKey}
                currentKey={itemProps.key.value || ""}
                currentValue={itemProps.value.value || ""}
                currentSection={itemProps.section.value || "Uncategorized"}
                newSectionName={itemProps.newSectionName?.value || ""}
                originalSection={sectionLabel}
                config={config}
                isEditing={isEditing}
              />
            }
          />
          <Action
            title="Test File Access"
            icon={Icon.Terminal}
            onAction={async () => {
              const info = await checkZshrcAccess();
              await showToast({
                style: info.writable ? Toast.Style.Success : Toast.Style.Failure,
                title: "Zshrc File Access",
                message: `${info.path}\nexists: ${info.exists} | readable: ${info.readable} | writable: ${info.writable}`,
              });
            }}
          />
          <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.key} title={config.keyLabel} placeholder={config.keyPlaceholder} />

      <Form.TextField {...itemProps.value} title={config.valueLabel} placeholder={config.valuePlaceholder} />

      <Form.Dropdown {...itemProps.section} title="Section" isLoading={isLoadingSections}>
        <Form.Dropdown.Item value="Uncategorized" title="Uncategorized" />
        {sections.map((section) => (
          <Form.Dropdown.Item key={section} value={section} title={section} />
        ))}
        <Form.Dropdown.Item value="New Section" title="➕ New Section" />
      </Form.Dropdown>

      {itemProps.section.value === "New Section" && (
        <Form.TextField {...itemProps.newSectionName} title="New Section Name" placeholder="e.g., My Custom Section" />
      )}
    </Form>
  );
}

/**
 * Props for DiffPreviewView
 */
interface DiffPreviewViewProps {
  existingKey?: string | undefined;
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
function DiffPreviewView({
  existingKey,
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
      let modifiedContent = zshrcContent;

      if (isEditing && existingKey) {
        // Editing existing item
        const sectionChanged = originalSection !== targetSection;

        if (sectionChanged) {
          // Moving to a different section
          const pattern = config.generatePattern(existingKey);
          const nonGlobalPattern = new RegExp(pattern.source, pattern.flags.replace("g", ""));

          // Remove the old line
          modifiedContent = zshrcContent.replace(nonGlobalPattern, () => "");
          modifiedContent = modifiedContent.replace(/\n\n\n+/g, "\n\n");

          // Generate the new line
          const itemLine = config.generateLine(key, value);

          // Find the target section
          const targetSectionBounds = findSectionBounds(modifiedContent, targetSection);

          if (targetSectionBounds) {
            const lines = modifiedContent.split(/\r?\n/);
            let insertLineIndex = targetSectionBounds.endLine - 1;

            for (let i = targetSectionBounds.endLine - 1; i >= targetSectionBounds.startLine - 1; i--) {
              const line = lines[i];
              if (line && line.trim().length > 0) {
                insertLineIndex = i;
                break;
              }
            }

            const beforeLines = lines.slice(0, insertLineIndex + 1);
            const afterLines = lines.slice(insertLineIndex + 1);
            const beforeSection = beforeLines.join("\n");
            const afterSection = afterLines.join("\n");

            modifiedContent = afterSection
              ? `${beforeSection}\n${itemLine}\n${afterSection}`
              : `${beforeSection}\n${itemLine}`;
          } else {
            modifiedContent = `${modifiedContent}\n\n# --- ${targetSection} --- #\n${itemLine}`;
          }
        } else {
          // Same section - update in place
          const pattern = config.generatePattern(existingKey);
          const nonGlobalPattern = new RegExp(pattern.source, pattern.flags.replace("g", ""));

          modifiedContent = zshrcContent.replace(nonGlobalPattern, (matchedLine) => {
            const leadingWhitespace = matchedLine.match(/^(\s*)/)?.[1] || "";
            const replacement = config.generateReplacement(key, value);
            return `${leadingWhitespace}${replacement.trimStart()}`;
          });
        }
      } else {
        // Adding new item
        const itemLine = config.generateLine(key, value);
        const sectionBounds = findSectionBounds(zshrcContent, targetSection);

        if (sectionBounds) {
          const lines = zshrcContent.split(/\r?\n/);
          let insertLineIndex = sectionBounds.endLine - 1;

          for (let i = sectionBounds.endLine - 1; i >= sectionBounds.startLine - 1; i--) {
            const line = lines[i];
            if (line && line.trim().length > 0) {
              insertLineIndex = i;
              break;
            }
          }

          const beforeLines = lines.slice(0, insertLineIndex + 1);
          const afterLines = lines.slice(insertLineIndex + 1);
          const beforeSection = beforeLines.join("\n");
          const afterSection = afterLines.join("\n");

          modifiedContent = afterSection
            ? `${beforeSection}\n${itemLine}\n${afterSection}`
            : `${beforeSection}\n${itemLine}`;
        } else {
          modifiedContent = `${zshrcContent}\n\n# --- ${targetSection} --- #\n${itemLine}`;
        }
      }

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
  }, [currentKey, currentValue, currentSection, newSectionName, originalSection, existingKey, config, isEditing]);

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
