import { List } from "@raycast/api";
import { usePresets } from "../../lib/usePresets";
import { PresetListItem } from "./presetListItem";

export const PresetList = () => {
  const { presets, loading } = usePresets({ limit: 1000 });
  return (
    <List
      filtering={true}
      navigationTitle="Search Presets"
      searchBarPlaceholder="Search for presets"
      isShowingDetail={!loading}
      isLoading={loading}
    >
      {presets.map((preset) => (
        <PresetListItem key={preset.id} preset={preset} />
      ))}
    </List>
  );
};
