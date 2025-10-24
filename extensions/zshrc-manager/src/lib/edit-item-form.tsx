import { Form, ActionPanel, Action, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { readZshrcFile, writeZshrcFile } from "./zsh";
import { ZSHRC_PATH } from "./zsh";

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
  const isEditing = !!existingKey;

  const { itemProps } = useForm({
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
        const zshrcContent = await readZshrcFile();

        if (isEditing) {
          // Update existing item
          const pattern = config.generatePattern(existingKey!);
          const replacement = config.generateReplacement(key, value);

          if (!pattern.test(zshrcContent)) {
            throw new Error(`${config.itemTypeCapitalized} "${existingKey}" not found in zshrc`);
          }

          const updatedContent = zshrcContent.replace(pattern, replacement);
          await writeZshrcFile(updatedContent);

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
            // Find the section and add the item at the end
            const sectionPattern = new RegExp(
              `(#\\s*section\\s*:\\s*${sectionLabel}[\\s\\S]*?)(?=#\\s*section\\s*:|$)`,
              "i",
            );
            const sectionMatch = zshrcContent.match(sectionPattern);

            if (sectionMatch) {
              const sectionEnd = sectionMatch[0].lastIndexOf("\n");
              const beforeSection = zshrcContent.substring(0, sectionMatch.index! + sectionEnd + 1);
              const afterSection = zshrcContent.substring(sectionMatch.index! + sectionEnd + 1);

              updatedContent = `${beforeSection}\n${itemLine}\n${afterSection}`;
            } else {
              // Section not found, add at the end of file
              updatedContent = `${zshrcContent}\n\n# ${sectionLabel}\n${itemLine}`;
            }
          } else {
            // No specific section, add at the end
            updatedContent = `${zshrcContent}\n\n${itemLine}`;
          }

          await writeZshrcFile(updatedContent);

          await showToast({
            style: Toast.Style.Success,
            title: `${config.itemTypeCapitalized} Added`,
            message: `Added ${config.itemType} "${key}"`,
          });
        }

        onSave?.();
        popToRoot();
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
      const zshrcContent = await readZshrcFile();
      const pattern = config.generatePattern(existingKey);

      if (!pattern.test(zshrcContent)) {
        throw new Error(`${config.itemTypeCapitalized} "${existingKey}" not found in zshrc`);
      }

      const updatedContent = zshrcContent.replace(pattern, "");
      await writeZshrcFile(updatedContent);

      await showToast({
        style: Toast.Style.Success,
        title: `${config.itemTypeCapitalized} Deleted`,
        message: `Deleted ${config.itemType} "${existingKey}"`,
      });

      onSave?.();
      popToRoot();
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
          />
          {isEditing && (
            <Action
              title={`Delete ${config.itemTypeCapitalized}`}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
            />
          )}
          <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
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
