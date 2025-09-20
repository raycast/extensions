import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  addAlias,
  aliasExists,
  getConfigFiles,
  parseAliases,
  removeAlias,
  updateAlias,
  validateAliasCommand,
  validateAliasName,
  type Alias,
} from "./utils/alias-utils";

/**
 * Add Alias Form Component
 */
function AddAliasForm({ onRefresh }: { onRefresh: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [commandError, setCommandError] = useState<string | undefined>();
  const configFiles = getConfigFiles();

  /**
   * Validate the form values
   * @param values - Form values to validate
   * @returns True if valid, false otherwise
   */
  function validateForm(values: { aliasName: string; aliasCommand: string; configFile: string }): boolean {
    let isValid = true;

    // Validate alias name
    const nameValidation = validateAliasName(values.aliasName);
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error);
      isValid = false;
    } else if (aliasExists(values.aliasName)) {
      setNameError(`Alias '${values.aliasName}' already exists`);
      isValid = false;
    } else {
      setNameError(undefined);
    }

    // Validate alias command
    const commandValidation = validateAliasCommand(values.aliasCommand);
    if (!commandValidation.isValid) {
      setCommandError(commandValidation.error);
      isValid = false;
    } else {
      setCommandError(undefined);
    }

    return isValid;
  }

  /**
   * Handle form submission
   * @param values - Form values
   */
  async function handleSubmit(values: { aliasName: string; aliasCommand: string; configFile: string }) {
    if (!validateForm(values)) {
      return;
    }

    try {
      addAlias(values.aliasName, values.aliasCommand, values.configFile);

      await showToast({
        style: Toast.Style.Success,
        title: "Alias added successfully",
        message: `'${values.aliasName}' added to ${values.configFile}`,
      });

      onRefresh();
      pop();
    } catch (error) {
      await showFailureToast(error instanceof Error ? error.message : "Unknown error", {
        title: "Failed to add alias",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Alias" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="aliasName"
        title="Alias Name"
        placeholder="e.g., ll"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="aliasCommand"
        title="Alias Command"
        placeholder="e.g., ls -la"
        error={commandError}
        onChange={() => setCommandError(undefined)}
      />
      <Form.Dropdown id="configFile" title="Configuration File" defaultValue={configFiles[0] || ""}>
        {configFiles.map((file) => (
          <Form.Dropdown.Item key={file} value={file} title={file} />
        ))}
      </Form.Dropdown>
      <Form.Description text="The alias will be added to the selected configuration file. You may need to restart your terminal or run 'source ~/<config-file>' for the changes to take effect." />
    </Form>
  );
}

/**
 * Edit Alias Form Component
 */
function EditAliasForm({
  aliasName,
  aliasCommand,
  configFile,
  onRefresh,
}: {
  aliasName: string;
  aliasCommand: string;
  configFile: string;
  onRefresh: () => void;
}) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [commandError, setCommandError] = useState<string | undefined>();
  const originalName = aliasName;

  async function handleSubmit(values: { aliasName: string; aliasCommand: string }) {
    let hasError = false;

    // Validate alias name
    const nameValidation = validateAliasName(values.aliasName);
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error);
      hasError = true;
    } else if (values.aliasName !== originalName && aliasExists(values.aliasName, configFile, originalName)) {
      setNameError(`Alias '${values.aliasName}' already exists`);
      hasError = true;
    } else {
      setNameError(undefined);
    }

    // Validate alias command
    const commandValidation = validateAliasCommand(values.aliasCommand);
    if (!commandValidation.isValid) {
      setCommandError(commandValidation.error);
      hasError = true;
    } else {
      setCommandError(undefined);
    }

    if (hasError) {
      return;
    }

    try {
      updateAlias(originalName, values.aliasName, values.aliasCommand, configFile);

      await showToast({
        style: Toast.Style.Success,
        title: "Alias updated successfully",
        message:
          values.aliasName !== originalName
            ? `'${originalName}' renamed to '${values.aliasName}' in ${configFile}`
            : `'${values.aliasName}' updated in ${configFile}`,
      });

      onRefresh();
      pop();
    } catch (error) {
      await showFailureToast(error instanceof Error ? error.message : "Unknown error", {
        title: "Failed to update alias",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Alias" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="aliasName"
        title="Alias Name"
        placeholder="e.g., ll"
        defaultValue={aliasName}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="aliasCommand"
        title="Alias Command"
        placeholder="e.g., ls -la"
        defaultValue={aliasCommand}
        error={commandError}
        onChange={() => setCommandError(undefined)}
      />
      <Form.Description title="Configuration File" text={configFile} />
      <Form.Description text="Note: You may need to restart your terminal or run 'source ~/<config-file>' for the changes to take effect." />
    </Form>
  );
}

export default function Command() {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Refresh the aliases list
   */
  function refreshAliases() {
    try {
      const loadedAliases = parseAliases();
      setAliases(loadedAliases);
    } catch (error) {
      showFailureToast(error instanceof Error ? error.message : "Unknown error", {
        title: "Failed to load aliases",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshAliases();
  }, []);

  /**
   * Handle alias removal with confirmation
   */
  async function handleRemoveAlias(alias: Alias) {
    const confirmed = await confirmAlert({
      title: "Remove Alias",
      message: `Are you sure you want to remove the alias '${alias.name}'?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      const removed = removeAlias(alias.name, alias.file);

      if (removed) {
        await showToast({
          style: Toast.Style.Success,
          title: "Alias removed successfully",
          message: `'${alias.name}' removed from ${alias.file}`,
        });
        refreshAliases();
      } else {
        await showFailureToast(`Alias '${alias.name}' not found in ${alias.file}`, {
          title: "Failed to remove alias",
        });
      }
    } catch (error) {
      await showFailureToast(error instanceof Error ? error.message : "Unknown error", {
        title: "Failed to remove alias",
      });
    }
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  return (
    <List
      searchBarPlaceholder="Search aliases..."
      actions={
        <ActionPanel>
          <Action.Push title="Add New Alias" icon={Icon.Plus} target={<AddAliasForm onRefresh={refreshAliases} />} />
        </ActionPanel>
      }
    >
      {aliases.length === 0 ? (
        <List.EmptyView
          title="No aliases found"
          description="No zsh aliases found in your configuration files"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Alias"
                icon={Icon.Plus}
                target={<AddAliasForm onRefresh={refreshAliases} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        aliases.map((alias) => (
          <List.Item
            key={alias.name}
            title={alias.name}
            subtitle={alias.command}
            accessories={[{ text: alias.file, icon: Icon.Document }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Alias"
                  icon={Icon.Pencil}
                  target={
                    <EditAliasForm
                      aliasName={alias.name}
                      aliasCommand={alias.command}
                      configFile={alias.file}
                      onRefresh={refreshAliases}
                    />
                  }
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
                <Action
                  title="Remove Alias"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemoveAlias(alias)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
                <Action.CopyToClipboard
                  title="Copy Alias Command"
                  content={alias.command}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  title="Copy Alias Name"
                  content={alias.name}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.Paste
                  title="Paste Alias Command"
                  content={alias.command}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
                <Action.Push
                  title="Add New Alias"
                  icon={Icon.Plus}
                  target={<AddAliasForm onRefresh={refreshAliases} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
