import { Action, ActionPanel, Form, Icon, showToast, Toast, getSelectedFinderItems, useNavigation } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { checkZipicInstallation } from "./utils/checkInstall";
import { Preset, getPresets, getDefaultPresetId } from "./utils/presetManager";

export default function Command() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const { pop } = useNavigation();
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(null);

  // 检查 Zipic 是否已安装并获取选中的文件和预设
  useEffect(() => {
    async function initialize() {
      const zipicInstalled = await checkZipicInstallation();
      setIsInstalled(zipicInstalled);

      if (zipicInstalled) {
        try {
          // 获取选中的文件
          const selectedItems = await getSelectedFinderItems();
          const paths = selectedItems.map((item) => item.path);

          if (paths.length === 0) {
            await showToast({
              style: Toast.Style.Failure,
              title: "No Files Selected",
              message: "Please select files in Finder before running this command",
            });
            pop();
            return;
          }

          setFilePaths(paths);

          // 获取预设和默认预设ID
          const loadedPresets = await getPresets();
          const defaultId = await getDefaultPresetId();

          setPresets(loadedPresets);
          setDefaultPresetId(defaultId);

          // 如果有默认预设，则选中它
          if (defaultId && loadedPresets.some((p) => p.id === defaultId)) {
            setSelectedPresetId(defaultId);
          } else if (loadedPresets.length > 0) {
            // 如果没有默认预设或默认预设不在列表中，选择第一个预设
            setSelectedPresetId(loadedPresets[0].id);
          }

          setIsLoading(false);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: error instanceof Error ? error.message : "Could not get selected Finder items or presets",
          });
          pop();
        }
      } else {
        pop();
      }
    }

    initialize();
  }, []);

  // 使用预设压缩图片
  async function compressWithPreset(presetId: string | null) {
    if (filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Files Selected",
      });
      return;
    }

    if (!presetId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Preset Selected",
        message: "Please select a preset to continue",
      });
      return;
    }

    try {
      // 查找选中的预设
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Preset Not Found",
        });
        return;
      }

      // 构建 URL 参数
      let urlParams = "";

      // 添加所有文件路径作为 url 参数
      filePaths.forEach((path) => {
        urlParams += `url=${encodeURIComponent(path)}&`;
      });

      // 添加压缩选项
      if (preset.level && preset.level !== "0") {
        urlParams += `level=${preset.level}&`;
      }

      if (preset.format && preset.format !== "original") {
        urlParams += `format=${preset.format}&`;
      }

      if (preset.location) {
        urlParams += `location=${preset.location}&`;

        // 只有当 location 为 custom 且 specified 为 false 时，才添加 directory 参数
        if (preset.location === "custom") {
          if (preset.specified) {
            urlParams += `specified=true&`;
          } else if (preset.directory) {
            urlParams += `directory=${encodeURIComponent(preset.directory)}&`;
          }
        }
      }

      if (preset.width && parseInt(preset.width) > 0) {
        urlParams += `width=${preset.width}&`;
      }

      if (preset.height && parseInt(preset.height) > 0) {
        urlParams += `height=${preset.height}&`;
      }

      if (preset.addSuffix) {
        urlParams += `addSuffix=${preset.addSuffix}&`;
        if (preset.suffix) {
          urlParams += `suffix=${encodeURIComponent(preset.suffix)}&`;
        }
      }

      if (preset.addSubfolder) {
        urlParams += `addSubfolder=${preset.addSubfolder}&`;
      }

      // 移除最后一个 & 符号
      if (urlParams.endsWith("&")) {
        urlParams = urlParams.slice(0, -1);
      }

      const url = `zipic://compress?${urlParams}`;

      await showToast({
        style: Toast.Style.Success,
        title: "Compressing with Zipic",
        message: `Using preset: ${preset.name}`,
      });

      exec(`open "${url}"`);
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to compress images",
      });
    }
  }

  // 获取选中的预设
  const selectedPreset = selectedPresetId ? presets.find((p) => p.id === selectedPresetId) : null;

  // 获取压缩级别描述
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

  // 获取格式描述
  function getFormatDescription(format: string): string {
    return format.charAt(0).toUpperCase() + format.slice(1) || "Original";
  }

  if (!isInstalled) {
    return null;
  }

  // 处理表单提交
  function handleSubmit() {
    compressWithPreset(selectedPresetId);
  }

  // 如果没有预设，显示提示
  if (presets.length === 0 && !isLoading) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Create Preset"
              icon={Icon.Plus}
              onAction={() => {
                showToast({
                  style: Toast.Style.Failure,
                  title: "No Presets Available",
                  message: "Please create a preset in the 'Manage Presets' command first",
                });
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="No Presets Available"
          text="You don't have any compression presets yet. Please create a preset using the 'Manage Presets' command first."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compress Images" icon={Icon.Compass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Selected Files" text={`${filePaths.length} item(s) selected for compression`} />

      <Form.Dropdown
        id="preset"
        title="Compression Preset"
        value={selectedPresetId || ""}
        onChange={setSelectedPresetId}
      >
        <Form.Dropdown.Section title="Your Presets">
          {presets.map((preset) => (
            <Form.Dropdown.Item
              key={preset.id}
              value={preset.id}
              title={`${preset.name}${defaultPresetId === preset.id ? " (Default)" : ""}`}
              icon={Icon.Document}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {selectedPreset ? (
        <>
          <Form.Description
            title="Preset Information"
            text={`Name: ${selectedPreset.name}
Model: Zipic Compression Preset
${defaultPresetId === selectedPreset.id ? "Default Preset: Yes" : ""}`}
          />

          <Form.Separator />

          <Form.Description
            title="Compression Options"
            text={`Level: ${getLevelDescription(selectedPreset.level)}
Format: ${getFormatDescription(selectedPreset.format)}`}
          />

          <Form.Separator />

          <Form.Description
            title="Save Options"
            text={`Location: ${selectedPreset.location === "original" ? "Original Location" : "Custom Location"}
${selectedPreset.location === "custom" ? (selectedPreset.specified ? "Use Default Save Directory: Yes" : `Directory: ${selectedPreset.directory}`) : ""}`}
          />

          <Form.Separator />

          <Form.Description
            title="Resize Options"
            text={`Width: ${parseInt(selectedPreset.width) > 0 ? `${selectedPreset.width}px` : "Auto"}
Height: ${parseInt(selectedPreset.height) > 0 ? `${selectedPreset.height}px` : "Auto"}`}
          />

          <Form.Separator />

          <Form.Description
            title="File Options"
            text={`Add Suffix: ${selectedPreset.addSuffix ? "Yes" : "No"}
${selectedPreset.addSuffix ? `Suffix: ${selectedPreset.suffix}` : ""}
Add Subfolder: ${selectedPreset.addSubfolder ? "Yes" : "No"}`}
          />
        </>
      ) : (
        <Form.Description title="No Preset Selected" text="Please select a preset from the dropdown menu." />
      )}
    </Form>
  );
}
