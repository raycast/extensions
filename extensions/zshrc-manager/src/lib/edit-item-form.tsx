import { Form, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState, useEffect } from "react";
import { readZshrcFileRaw, writeZshrcFile, checkZshrcAccess, getZshrcPath, readZshrcFile } from "./zsh";
import { findSectionBounds } from "./section-detector";
import { clearCache } from "./cache";
import { toLogicalSections } from "./parse-zshrc";

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

            await writeZshrcFile(updatedContent);
            clearCache(getZshrcPath());
            const verify = await readZshrcFileRaw();
            if (verify !== updatedContent) {
              throw new Error("Write verification failed: content mismatch after save");
            }

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
            await writeZshrcFile(updatedContent);
            clearCache(getZshrcPath());
            // Verify write by re-reading and comparing
            const verify = await readZshrcFileRaw();
            if (verify !== updatedContent) {
              throw new Error("Write verification failed: content mismatch after save");
            }

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

          await writeZshrcFile(updatedContent);
          clearCache(getZshrcPath());
          const verify = await readZshrcFileRaw();
          if (verify !== updatedContent) {
            throw new Error("Write verification failed: content mismatch after save");
          }

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
      await writeZshrcFile(updatedContent);
      clearCache(getZshrcPath());
      const verify = await readZshrcFileRaw();
      if (verify !== updatedContent) {
        throw new Error("Write verification failed: content mismatch after delete");
      }

      await showToast({
        style: Toast.Style.Success,
        title: `${config.itemTypeCapitalized} Deleted`,
        message: `Deleted ${config.itemType} "${existingKey}"`,
      });

      onSave?.();
      pop();
    } catch (error) {
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
