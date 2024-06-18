import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  getPreferenceValues,
  openCommandPreferences,
  useNavigation,
} from "@raycast/api";
import { useMemo } from "react";
import { getFilesInDirectory, setWallpaper } from "../utils/common-utils";
import ChoosingFolder from "./ChoosingFolder";

interface Preferences {
  gridSize: string;
  wallpaperTitle: boolean;
}

export default function GridGallery({
  folder,
  setCachedFolder,
}: {
  folder: string;
  setCachedFolder: (folder: string) => void;
}) {
  const files = useMemo(() => getFilesInDirectory(folder), [folder]);
  const { push } = useNavigation();
  const { gridSize, wallpaperTitle } = getPreferenceValues<Preferences>();

  return (
    <Grid
      columns={Number(gridSize)}
      fit={Grid.Fit.Fill}
      aspectRatio={"16/9"}
      filtering={false}
      searchBarPlaceholder="Search for wallpapers"
    >
      <Grid.EmptyView
        icon={Icon.Image}
        title={"No wallpapers found. Add some images."}
        actions={
          <ActionPanel>
            <Action
              title="Change Folder Path"
              icon={Icon.Folder}
              onAction={() => {
                push(<ChoosingFolder setCachedFolder={setCachedFolder} />);
              }}
              shortcut={{ modifiers: ["opt"], key: "p" }}
            />
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
              onAction={() => openCommandPreferences()}
            />
          </ActionPanel>
        }
      />
      {files.map((file) => (
        <Grid.Item
          key={file}
          content={{ source: file }}
          title={wallpaperTitle ? file.split("/").pop() : undefined}
          actions={
            <ActionPanel>
              <Action title="Set as Wallpaper" icon={Icon.Desktop} onAction={() => setWallpaper(file)} />
              <Action.ShowInFinder path={file} />
              <Action
                title="Change Folder Path"
                icon={Icon.Folder}
                onAction={() => {
                  push(<ChoosingFolder setCachedFolder={setCachedFolder} />);
                }}
                shortcut={{ modifiers: ["opt"], key: "p" }}
              />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
                onAction={() => openCommandPreferences()}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
