import { Action, ActionPanel, Clipboard, closeMainWindow, environment, Grid, Icon, showHUD } from "@raycast/api";
import { readdirSync, statSync } from "fs";
import { basename, join } from "path";
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
    <Grid columns={3}>
      <Grid.Section title="Colors" columns={6}>
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
      subtitle={props.color.value}
      content={{
        color: {
          light: props.color.value,
          dark: props.color.value,
          adjustContrast: false,
        },
      }}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={props.color.value} />
        </ActionPanel>
      }
    />
  );
}

function CopyFileToClipboardAction(props: { file: string }) {
  return (
    <Action
      title="Copy to Clipboard"
      icon={Icon.Clipboard}
      onAction={() => {
        Clipboard.copy({ file: props.file });
        closeMainWindow();
        showHUD("Copied to Clipboard");
      }}
    />
  );
}
