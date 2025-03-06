import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Preset,
  getPresets,
  savePreset,
  deletePreset,
  getDefaultPresetId,
  setDefaultPresetId as setDefaultPreset,
} from "./utils/presetManager";

export default function ManagePresets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    async function loadPresets() {
      try {
        const loadedPresets = await getPresets();
        const defaultId = await getDefaultPresetId();

        setPresets(loadedPresets);
        setDefaultPresetId(defaultId);

        if (loadedPresets.length > 0) {
          setSelectedPresetId(loadedPresets[0].id);
        }

        setIsLoading(false);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load presets",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    loadPresets();
  }, []);

  async function handleDeletePreset(presetId: string) {
    const options: Alert.Options = {
      title: "Delete Preset",
      message: "Are you sure you want to delete this preset? This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        await deletePreset(presetId);

        const updatedPresets = presets.filter((p) => p.id !== presetId);
        setPresets(updatedPresets);

        if (selectedPresetId === presetId) {
          if (updatedPresets.length > 0) {
            setSelectedPresetId(updatedPresets[0].id);
          } else {
            setSelectedPresetId(null);
          }
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Preset deleted",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete preset",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleSetDefaultPreset(presetId: string | null) {
    try {
      await setDefaultPreset(presetId);
      setDefaultPresetId(presetId);

      await showToast({
        style: Toast.Style.Success,
        title: "Default preset updated",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update default preset",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const selectedPreset = selectedPresetId ? presets.find((p) => p.id === selectedPresetId) : null;

  function getLevelDescription(level: string): string {
    const levelMap: Record<string, string> = {
      "1": "Level 1 - Highest Quality",
      "2": "Level 2 - Very Good Quality",
      "3": "Level 3 - Good Quality (Recommended)",
      "4": "Level 4 - Medium Quality",
      "5": "Level 5 - Low Quality",
      "6": "Level 6 - Lowest Quality",
    };
    return levelMap[level] || level || "Default";
  }

  function getFormatDescription(format: string): string {
    return format.charAt(0).toUpperCase() + format.slice(1) || "Original";
  }

  function renderPresetDetail() {
    if (!selectedPreset) {
      return (
        <List.Item.Detail
          markdown="Select a preset from the list to view details."
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="No Preset Selected" />
            </List.Item.Detail.Metadata>
          }
        />
      );
    }

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Information" />
            <List.Item.Detail.Metadata.Label title="Name" text={selectedPreset.name} />
            <List.Item.Detail.Metadata.Label title="Model" text="Zipic Compression Preset" />
            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label title="Compression Options" />
            <List.Item.Detail.Metadata.Label
              title="Compression Level"
              text={getLevelDescription(selectedPreset.level)}
            />
            <List.Item.Detail.Metadata.Label title="Output Format" text={getFormatDescription(selectedPreset.format)} />
            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label title="Save Options" />
            <List.Item.Detail.Metadata.Label
              title="Save Location"
              text={selectedPreset.location === "original" ? "Original Location" : "Custom Location"}
            />
            {selectedPreset.location === "custom" && (
              <>
                <List.Item.Detail.Metadata.Label
                  title="Use Default Save Directory"
                  text={selectedPreset.specified ? "Yes" : "No"}
                />
                {!selectedPreset.specified && selectedPreset.directory && (
                  <List.Item.Detail.Metadata.Label title="Directory" text={String(selectedPreset.directory)} />
                )}
              </>
            )}
            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label title="Resize Options" />
            <List.Item.Detail.Metadata.Label
              title="Width"
              text={parseInt(selectedPreset.width) > 0 ? `${selectedPreset.width}px` : "Auto"}
            />
            <List.Item.Detail.Metadata.Label
              title="Height"
              text={parseInt(selectedPreset.height) > 0 ? `${selectedPreset.height}px` : "Auto"}
            />
            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label title="File Options" />
            <List.Item.Detail.Metadata.Label title="Add Suffix" text={selectedPreset.addSuffix ? "Yes" : "No"} />
            {selectedPreset.addSuffix && (
              <List.Item.Detail.Metadata.Label title="Suffix" text={selectedPreset.suffix} />
            )}
            <List.Item.Detail.Metadata.Label title="Add Subfolder" text={selectedPreset.addSubfolder ? "Yes" : "No"} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Compression Presets..."
      selectedItemId={selectedPresetId || ""}
      onSelectionChange={(id) => setSelectedPresetId(id || null)}
      navigationTitle="Manage Compression Presets"
    >
      <List.Section title="Your Presets">
        {presets.length === 0 ? (
          <List.Item
            title="No Presets Yet"
            icon={Icon.Box}
            detail={
              <List.Item.Detail
                markdown="Create your first preset by clicking the 'Create Preset' action."
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Tip" text="Use the + button to create a new preset" />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ) : (
          presets.map((preset) => (
            <List.Item
              key={preset.id}
              id={preset.id}
              title={preset.name}
              subtitle={`Level: ${preset.level || "Default"}, Format: ${preset.format || "Original"}`}
              icon={Icon.Document}
              detail={selectedPresetId === preset.id ? renderPresetDetail() : undefined}
              accessories={[
                {
                  icon: defaultPresetId === preset.id ? Icon.Checkmark : undefined,
                  tooltip: defaultPresetId === preset.id ? "Current Default" : "Set as Default",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit Preset"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(
                        <EditPresetForm
                          preset={preset}
                          onSave={(updatedPreset) => {
                            setPresets(presets.map((p) => (p.id === updatedPreset.id ? updatedPreset : p)));
                          }}
                        />,
                      )
                    }
                  />
                  <Action title="Set as Default" icon={Icon.Star} onAction={() => handleSetDefaultPreset(preset.id)} />
                  <Action
                    title="Delete Preset"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeletePreset(preset.id)}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Create New Preset"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Create Preset"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <EditPresetForm
                      onSave={(newPreset) => {
                        setPresets([...presets, newPreset]);
                        setSelectedPresetId(newPreset.id);
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function EditPresetForm({ preset, onSave }: { preset?: Preset; onSave: (preset: Preset) => void }) {
  const { pop } = useNavigation();
  const isEditing = !!preset;

  const [formValues, setFormValues] = useState<Omit<Preset, "id">>({
    name: preset?.name || "",
    level: preset?.level || "3",
    format: preset?.format || "original",
    location: preset?.location || "original",
    directory: preset?.directory || "",
    width: preset?.width || "0",
    height: preset?.height || "0",
    addSuffix: preset?.addSuffix || false,
    suffix: preset?.suffix || "-compressed",
    addSubfolder: preset?.addSubfolder || false,
    specified: preset?.specified || false,
  });

  async function handleSubmit(values: Omit<Preset, "id">) {
    try {
      const newPreset: Preset = {
        id: preset?.id || uuidv4(),
        ...values,
      };

      await savePreset(newPreset);
      onSave(newPreset);

      await showToast({
        style: Toast.Style.Success,
        title: isEditing ? "Preset updated" : "Preset created",
      });

      pop();
    } catch (error) {
      await showFailureToast(
        error instanceof Error ? error.message : isEditing ? "Failed to update preset" : "Failed to create preset",
      );
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Preset" : "Create Preset"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset Name"
        placeholder="My Preset"
        info="A name to identify this preset"
        defaultValue={formValues.name}
        onChange={(value) => setFormValues({ ...formValues, name: value })}
        autoFocus
      />

      <Form.Separator />

      <Form.Dropdown
        id="level"
        title="Compression Level"
        info="Lower levels preserve more quality but result in larger files"
        defaultValue={formValues.level}
        onChange={(newValue) => setFormValues({ ...formValues, level: newValue })}
      >
        <Form.Dropdown.Item value="1" title="Level 1 - Highest Quality" />
        <Form.Dropdown.Item value="2" title="Level 2 - Very Good Quality" />
        <Form.Dropdown.Item value="3" title="Level 3 - Good Quality (Recommended)" />
        <Form.Dropdown.Item value="4" title="Level 4 - Medium Quality" />
        <Form.Dropdown.Item value="5" title="Level 5 - Low Quality" />
        <Form.Dropdown.Item value="6" title="Level 6 - Lowest Quality" />
      </Form.Dropdown>

      <Form.Dropdown
        id="format"
        title="Output Format"
        defaultValue={formValues.format}
        onChange={(newValue) => setFormValues({ ...formValues, format: newValue })}
      >
        <Form.Dropdown.Item value="original" title="Original" />
        <Form.Dropdown.Item value="jpeg" title="JPEG" />
        <Form.Dropdown.Item value="webp" title="WebP" />
        <Form.Dropdown.Item value="heic" title="HEIC" />
        <Form.Dropdown.Item value="avif" title="AVIF" />
        <Form.Dropdown.Item value="png" title="PNG" />
      </Form.Dropdown>

      <Form.Dropdown
        id="location"
        title="Save Location"
        defaultValue={formValues.location}
        onChange={(newValue) => {
          setFormValues({
            ...formValues,
            location: newValue,
            ...(newValue === "original" ? { specified: false, directory: "" } : {}),
          });
        }}
      >
        <Form.Dropdown.Item value="original" title="Original Location" />
        <Form.Dropdown.Item value="custom" title="Custom Location" />
      </Form.Dropdown>

      {formValues.location === "custom" && (
        <>
          <Form.Checkbox
            id="specified"
            title="Use Default Save Directory"
            label="Use Default Save Directory"
            info="Enable to use Zipic's default save directory instead of specifying one"
            defaultValue={formValues.specified}
            onChange={(value) => setFormValues({ ...formValues, specified: value })}
          />

          {!formValues.specified && (
            <Form.FilePicker
              id="directory"
              title="Save Directory"
              allowMultipleSelection={false}
              canChooseDirectories
              canChooseFiles={false}
              info="Select a directory to save the compressed files"
              value={formValues.directory ? [formValues.directory] : []}
              onChange={(paths) => {
                if (paths.length > 0) {
                  setFormValues({ ...formValues, directory: paths[0] });
                }
              }}
            />
          )}
        </>
      )}

      <Form.TextField
        id="width"
        title="Width"
        placeholder="0"
        info="Sets the desired width (0 for auto-adjust)"
        defaultValue={formValues.width}
        onChange={(value) => {
          const numValue = value.replace(/[^0-9]/g, "");
          setFormValues({ ...formValues, width: numValue });
        }}
      />

      <Form.TextField
        id="height"
        title="Height"
        placeholder="0"
        info="Sets the desired height (0 for auto-adjust)"
        defaultValue={formValues.height}
        onChange={(value) => {
          const numValue = value.replace(/[^0-9]/g, "");
          setFormValues({ ...formValues, height: numValue });
        }}
      />

      <Form.Checkbox
        id="addSuffix"
        title="Add Suffix"
        label="Add Suffix"
        defaultValue={formValues.addSuffix}
        onChange={(value) => setFormValues({ ...formValues, addSuffix: value })}
      />

      {formValues.addSuffix && (
        <Form.TextField
          id="suffix"
          title="Suffix"
          placeholder="-compressed"
          info="Suffix to add to the compressed file names"
          defaultValue={formValues.suffix}
          onChange={(value) => setFormValues({ ...formValues, suffix: value })}
        />
      )}

      <Form.Checkbox
        id="addSubfolder"
        title="Add Subfolder"
        label="Add Subfolder"
        defaultValue={formValues.addSubfolder}
        onChange={(value) => setFormValues({ ...formValues, addSubfolder: value })}
      />
    </Form>
  );
}
