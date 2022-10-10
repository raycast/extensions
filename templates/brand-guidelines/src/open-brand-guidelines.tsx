import { Action, ActionPanel, environment, Grid, Icon, Toast } from "@raycast/api";
import { readdirSync, statSync } from "fs";
import { basename, join } from "path";
import { runAppleScript } from "run-applescript";
import { titleCase } from "title-case";
import colors from "../assets/colors.json";

type Color = {
  name: string;
  value: string;
};

export default function Command() {
  const dirs = readdirSync(environment.assetsPath)
    .map((item) => join(environment.assetsPath, item))
    .filter((item) => statSync(item).isDirectory());

  return (
    <Grid>
      <Grid.Section title="Colors">
        {colors.map((color) => (
          <ColorItem key={color.name} color={color} />
        ))}
      </Grid.Section>
      {dirs.map((dir) => (
        <DirectorySection key={dir} dir={dir} />
      ))}
    </Grid>
  );
}

function DirectorySection(props: { dir: string }) {
  const files = readdirSync(props.dir)
    .map((item) => join(props.dir, item))
    .filter((item) => statSync(item).isFile());

  return (
    <Grid.Section title={titleCase(basename(props.dir))}>
      {files.map((file) => (
        <FileItem key={file} file={file} />
      ))}
    </Grid.Section>
  );
}

function FileItem(props: { file: string }) {
  return (
    <Grid.Item
      title={basename(props.file)}
      content={props.file}
      actions={
        <ActionPanel>
          <CopyFileToClipboardAction file={props.file} />
        </ActionPanel>
      }
    />
  );
}

function ColorItem(props: { color: Color }) {
  return (
    <Grid.Item
      title={props.color.name}
      subtitle={props.color.name}
      content={{
        color: {
          light: props.color.value,
          dark: props.color.value,
          adjustContrast: false,
        },
      }}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={props.color.name} />
        </ActionPanel>
      }
    />
  );
}

function CopyFileToClipboardAction(props: { file: string }) {
  async function handleAction() {
    const toast = new Toast({
      style: Toast.Style.Animated,
      title: `Copying file to clipboard`,
    });
    await toast.show();

    try {
      await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${props.file}" )`);

      toast.style = Toast.Style.Success;
      toast.title = `Copied file to clipboard`;
    } catch (error) {
      console.error(error);

      toast.style = Toast.Style.Failure;
      toast.title = `Failed copying file to clipboard`;
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={handleAction} />;
}
