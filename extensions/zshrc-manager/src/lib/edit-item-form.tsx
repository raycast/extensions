import { Form, ActionPanel, Action, Icon, showToast, Toast, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState, useEffect } from "react";
import { readZshrcFileRaw, writeZshrcFile, checkZshrcAccess, getZshrcPath, readZshrcFile } from "./zsh";
import { clearCache } from "./cache";
import { toLogicalSections } from "./parse-zshrc";
import { saveToHistory } from "./history";
import { log } from "../utils/logger";
import { validateStructure } from "../utils/validation";
import { SaveCancelledError } from "../utils/errors";
import { computeDeletedContent, computeUpdatedContent, type EditItemConfig } from "./edit-item-write";
import { DiffPreviewView } from "./edit-item-preview";

// Re-exported so existing callers keep importing the config type from here
export type { EditItemConfig } from "./edit-item-write";

interface EditItemFormProps {
  /** Existing key value (for editing) */
  existingKey?: string | undefined;
  /** Existing value (for editing) */
  existingValue?: string | undefined;
  /** Section where this item belongs */
  sectionLabel?: string | undefined;
  /** 0-based instance of the section label when the same label appears more than once */
  sectionOccurrence?: number | undefined;
  /** Callback when item is saved */
  onSave?: (() => void) | undefined;
  /** Configuration for the form */
  config: EditItemConfig;
}

/**
 * Writes the updated content, invalidates the cache, verifies the write by
 * re-reading, and records history only after verification succeeds. The
 * history entry stores `previousContent` — the pre-change snapshot — so
 * undo restores the state before this write.
 */
async function persistAndVerify(
  updatedContent: string,
  previousContent: string,
  historyLabel: string,
  logContext: string,
): Promise<void> {
  await writeZshrcFile(updatedContent);
  clearCache(getZshrcPath());
  const verify = await readZshrcFileRaw();
  if (verify !== updatedContent) {
    log.edit.error(`Write verification failed for ${logContext}`);
    throw new Error("Write verification failed: content mismatch after save");
  }
  await saveToHistory(historyLabel, previousContent);
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
 * The content each save produces is computed by the pure functions in
 * `edit-item-write.ts`, shared with the diff preview.
 *
 * @param existingKey - Existing key value (for editing mode)
 * @param existingValue - Existing value (for editing mode)
 * @param sectionLabel - Section where this item belongs
 * @param onSave - Callback invoked after successful save
 * @param config - Configuration object defining item-specific behavior
 */
export default function EditItemForm({
  existingKey,
  existingValue,
  sectionLabel,
  sectionOccurrence,
  onSave,
  config,
}: EditItemFormProps) {
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
        const updatedContent = computeUpdatedContent(zshrcContent, {
          config,
          key,
          value,
          targetSection,
          isEditing,
          existingKey,
          originalSection: sectionLabel,
          sectionOccurrence,
        });

        if (isEditing) {
          const moved = sectionLabel !== targetSection;
          log.edit.info(
            moved
              ? `Updating ${config.itemType} "${key}" and moving to section "${targetSection}"`
              : `Updating ${config.itemType} "${key}" in place`,
          );
          await persistAndVerify(
            updatedContent,
            zshrcContent,
            moved
              ? `Update ${config.itemType} "${key}" (move to ${targetSection})`
              : `Update ${config.itemType} "${key}"`,
            `${config.itemType} "${key}"`,
          );
          log.edit.info(`Successfully updated ${config.itemType} "${key}"`);

          await showToast({
            style: Toast.Style.Success,
            title: `${config.itemTypeCapitalized} Updated`,
            message: moved
              ? `Updated ${config.itemType} "${key}" and moved to "${targetSection}"`
              : `Updated ${config.itemType} "${key}"`,
          });
        } else {
          log.edit.info(`Adding new ${config.itemType} "${key}" to section "${targetSection}"`);
          await persistAndVerify(
            updatedContent,
            zshrcContent,
            `Add ${config.itemType} "${key}"`,
            `new ${config.itemType} "${key}"`,
          );
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
        if (error instanceof SaveCancelledError) {
          return; // user cancelled from the validation dialog — stay on the form
        }
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
      const updatedContent = computeDeletedContent(zshrcContent, {
        config,
        existingKey,
        sectionLabel,
        sectionOccurrence,
      });

      log.edit.info(`Deleting ${config.itemType} "${existingKey}"`);
      await persistAndVerify(
        updatedContent,
        zshrcContent,
        `Delete ${config.itemType} "${existingKey}"`,
        `delete of ${config.itemType} "${existingKey}"`,
      );
      log.edit.info(`Successfully deleted ${config.itemType} "${existingKey}"`);

      await showToast({
        style: Toast.Style.Success,
        title: `${config.itemTypeCapitalized} Deleted`,
        message: `Deleted ${config.itemType} "${existingKey}"`,
      });

      onSave?.();
      pop();
    } catch (error) {
      if (error instanceof SaveCancelledError) {
        return;
      }
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
                sectionOccurrence={sectionOccurrence}
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
