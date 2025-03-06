import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  getSelectedFinderItems,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { exec } from "child_process";
import { useState, useEffect } from "react";
import { checkZipicInstallation } from "./utils/checkInstall";

interface CompressionOptions {
  level: string;
  format: string;
  location: string;
  directory: string;
  width: string;
  height: string;
  addSuffix: boolean;
  suffix: string;
  addSubfolder: boolean;
  specified: boolean;
}

interface FormValues {
  level: string;
  format: string;
  location: string;
  directory: string;
  width: string;
  height: string;
  addSuffix: boolean;
  suffix: string;
  addSubfolder: boolean;
  specified: boolean;
}

export default function Command() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isInstalled, setIsInstalled] = useState(false);

  const preferences = getPreferenceValues<CompressionOptions>();

  const [formValues, setFormValues] = useState<FormValues>({
    level: preferences.level ? String(parseInt(preferences.level.toString())) : "3",
    format: preferences.format || "original",
    location: preferences.location || "original",
    directory: preferences.directory || "",
    width: preferences.width?.toString() || "0",
    height: preferences.height?.toString() || "0",
    addSuffix: preferences.addSuffix || false,
    suffix: preferences.suffix || "-compressed",
    addSubfolder: preferences.addSubfolder || false,
    specified: preferences.specified || false,
  });

  useEffect(() => {
    async function initialize() {
      const zipicInstalled = await checkZipicInstallation();
      setIsInstalled(zipicInstalled);

      if (zipicInstalled) {
        try {
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
          setIsLoading(false);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: error instanceof Error ? error.message : "Could not get selected Finder items",
          });
          pop();
        }
      } else {
        pop();
      }
    }

    initialize();
  }, []);

  async function handleSubmit(values: FormValues) {
    if (filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Files Selected",
      });
      return;
    }

    try {
      let urlParams = "";

      filePaths.forEach((path) => {
        urlParams += `url=${encodeURIComponent(path)}&`;
      });

      if (values.level && values.level !== "0") {
        urlParams += `level=${values.level}&`;
      }

      if (values.format && values.format !== "original") {
        urlParams += `format=${values.format}&`;
      }

      if (values.location) {
        urlParams += `location=${values.location}&`;

        if (values.location === "custom") {
          if (values.specified) {
            urlParams += `specified=true&`;
          } else if (values.directory) {
            urlParams += `directory=${encodeURIComponent(values.directory)}&`;
          }
        }
      }

      if (values.width && !isNaN(parseInt(values.width)) && parseInt(values.width) > 0) {
        urlParams += `width=${parseInt(values.width)}&`;
      }

      if (values.height && !isNaN(parseInt(values.height)) && parseInt(values.height) > 0) {
        urlParams += `height=${parseInt(values.height)}&`;
      }

      if (values.addSuffix) {
        urlParams += `addSuffix=${values.addSuffix}&`;
        if (values.suffix) {
          urlParams += `suffix=${encodeURIComponent(values.suffix)}&`;
        }
      }

      if (values.addSubfolder) {
        urlParams += `addSubfolder=${values.addSubfolder}&`;
      }

      if (urlParams.endsWith("&")) {
        urlParams = urlParams.slice(0, -1);
      }

      const url = `zipic://compress?${urlParams}`;

      await showToast({
        style: Toast.Style.Success,
        title: "Compressing with Zipic",
        message: `Compressing ${filePaths.length} item(s)`,
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

  if (!isInstalled) {
    return null;
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
      <Form.Description text={`Selected ${filePaths.length} item(s) for compression`} />

      <Form.Separator />

      <Form.Dropdown
        id="level"
        title="Compression Level"
        info="Lower levels preserve more quality but result in larger files"
        value={formValues.level}
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
        value={formValues.format}
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
        value={formValues.location}
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
            value={formValues.specified}
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
        value={formValues.width}
        onChange={(value) => setFormValues({ ...formValues, width: value })}
      />

      <Form.TextField
        id="height"
        title="Height"
        placeholder="0"
        info="Sets the desired height (0 for auto-adjust)"
        value={formValues.height}
        onChange={(value) => setFormValues({ ...formValues, height: value })}
      />

      <Form.Checkbox
        id="addSuffix"
        title="Add Suffix"
        label="Add Suffix"
        value={formValues.addSuffix}
        onChange={(value) => setFormValues({ ...formValues, addSuffix: value })}
      />

      {formValues.addSuffix && (
        <Form.TextField
          id="suffix"
          title="Suffix"
          placeholder="-compressed"
          info="Suffix to add to the compressed file names"
          value={formValues.suffix}
          onChange={(value) => setFormValues({ ...formValues, suffix: value })}
        />
      )}

      <Form.Checkbox
        id="addSubfolder"
        title="Add Subfolder"
        label="Add Subfolder"
        value={formValues.addSubfolder}
        onChange={(value) => setFormValues({ ...formValues, addSubfolder: value })}
      />
    </Form>
  );
}
