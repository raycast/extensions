import { Form, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { readZshrcFileRaw, writeZshrcFile, checkZshrcAccess, getZshrcPath } from "./zsh";
import { findSectionBounds } from "./section-detector";
import { clearCache } from "./cache";

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
 */
export default function EditItemForm({ existingKey, existingValue, sectionLabel, onSave, config }: EditItemFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!existingKey;

  const { itemProps, handleSubmit } = useForm({
    initialValues: {
      key: existingKey || "",
      value: existingValue || "",
    },
    onSubmit: async (values) => {
      const key = values.key?.trim() || "";
      const value = values.value?.trim() || "";

      if (!key || !value) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: `Both ${config.keyLabel.toLowerCase()} and ${config.valueLabel.toLowerCase()} are required`,
        });
        return;
      }

      try {
        const zshrcContent = await readZshrcFileRaw();

        if (isEditing) {
          // Update existing item - replace only the first match
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
        } else {
          // Add new item
          const itemLine = config.generateLine(key, value);

          // Find the section to add the item to
          let updatedContent = zshrcContent;

          if (sectionLabel) {
            // Find the section using all supported formats
            const sectionBounds = findSectionBounds(zshrcContent, sectionLabel);

            if (sectionBounds) {
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
              // Section not found, add at the end of file with a section header
              // Use a simple format that's commonly supported
              updatedContent = `${zshrcContent}\n\n# --- ${sectionLabel} --- #\n${itemLine}`;
            }
          } else {
            // No specific section, add at the end
            updatedContent = `${zshrcContent}\n\n${itemLine}`;
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

      {sectionLabel && (
        <Form.Description
          title="Section"
          text={`This ${config.itemType} will be added to the "${sectionLabel}" section`}
        />
      )}
    </Form>
  );
}
