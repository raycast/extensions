import {
  Action,
  ActionPanel,
  getSelectedFinderItems,
  Icon,
  List,
  open,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { checkZipicInstallation } from "./utils/checkInstall";
import { buildCompressURL, describePreset, readZipicPresets, ZipicPreset } from "./utils/zipicPresets";

export default function Command() {
  const [presets, setPresets] = useState<ZipicPreset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const installed = await checkZipicInstallation();
      if (!installed) {
        await popToRoot();
        return;
      }

      try {
        const items = await getSelectedFinderItems();
        const paths = items.map((item) => item.path);
        if (paths.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No Files Selected",
            message: "Please select files in Finder before running this command",
          });
          await popToRoot();
          return;
        }
        setFilePaths(paths);

        const data = await readZipicPresets();
        setPresets(data.presets);
        setSelectedId(data.selectedPresetId);
      } catch (error) {
        await showFailureToast(error, { title: "Failed to load Zipic presets" });
        await popToRoot();
        return;
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function compress(preset: ZipicPreset) {
    try {
      const url = buildCompressURL(filePaths, preset);
      await open(url);
      await showHUD(`Compressing ${filePaths.length} item(s) · preset: ${preset.name}`);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to compress images" });
    }
  }

  if (!isLoading && presets.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.WrenchScrewdriver}
          title="No Presets Found"
          description="Open Zipic and create a preset to use this command."
          actions={
            <ActionPanel>
              <Action title="Open Zipic" icon={Icon.AppWindow} onAction={() => open("zipic://")} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search presets…">
      <List.Section title="Presets" subtitle="Managed in the Zipic app">
        {presets.map((preset) => (
          <List.Item
            key={preset.id}
            title={preset.name}
            subtitle={preset.id === selectedId ? "Default" : undefined}
            icon={preset.isFavorite ? Icon.Star : Icon.Document}
            accessories={preset.id === selectedId ? [{ icon: Icon.Checkmark }] : undefined}
            detail={<List.Item.Detail metadata={renderMetadata(preset)} />}
            actions={
              <ActionPanel>
                <Action title="Compress with Preset" icon={Icon.Wand} onAction={() => compress(preset)} />
                <Action title="Open Zipic" icon={Icon.AppWindow} onAction={() => open("zipic://")} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function renderMetadata(preset: ZipicPreset) {
  const o = preset.compressionOption;
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Name" text={preset.name} />
      <List.Item.Detail.Metadata.Label title="Summary" text={describePreset(preset)} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Compression Level" text={String(o.level)} />
      <List.Item.Detail.Metadata.Label title="Format" text={o.format} />
      <List.Item.Detail.Metadata.Label title="Overwrite" text={o.overwrite ? "Yes" : "No"} />
      <List.Item.Detail.Metadata.Label title="Progressive" text={o.progressive ? "Yes" : "No"} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Save Location" text={o.saving.location} />
      <List.Item.Detail.Metadata.Label title="Default Save Directory" text={o.saving.specified ? "Yes" : "No"} />
      <List.Item.Detail.Metadata.Label title="Suffix" text={o.saving.suffix.enable ? o.saving.suffix.value : "Off"} />
      <List.Item.Detail.Metadata.Label
        title="Subfolder"
        text={o.saving.subfolder.enable ? o.saving.subfolder.value : "Off"}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Resize"
        text={
          o.resizing.width === 0 && o.resizing.height === 0
            ? "Off"
            : `${o.resizing.width || "auto"} × ${o.resizing.height || "auto"}${o.resizing.ratio ? " (keep ratio)" : ""}`
        }
      />
    </List.Item.Detail.Metadata>
  );
}
