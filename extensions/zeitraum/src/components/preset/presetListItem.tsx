import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { Preset } from "@zeitraum/client";
import { confirmPresetDeletion, createTimeSpanFromPreset, updatePreset } from "../../lib/zeitraumClient";
import { PresetEditForm } from "./presetEditForm";

type PresetListItemProps = {
  preset: Preset;
};

export const PresetListItem = ({ preset }: PresetListItemProps) => {
  const { push } = useNavigation();

  const onEdit = () => push(<PresetEditForm preset={preset} onSubmit={(values) => updatePreset(preset, values)} />);

  return (
    <List.Item
      title={preset.name}
      icon={Icon.BlankDocument}
      actions={
        <ActionPanel>
          <Action title="Track" onAction={() => createTimeSpanFromPreset(preset.id)} icon={Icon.Play} />
          <Action title="Edit" onAction={onEdit} icon={Icon.Pencil} />
          <Action
            style={Action.Style.Destructive}
            title="Delete"
            onAction={() => confirmPresetDeletion(preset.id)}
            icon={Icon.Trash}
            shortcut={{ key: "backspace", modifiers: ["cmd"] }}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label title="Name" text={preset.name} />
              {preset.note && <Detail.Metadata.Label title="Note" text={preset.note} icon={Icon.Bubble} />}
              {preset.tags.length > 0 && (
                <Detail.Metadata.TagList title="Tags">
                  {preset.tags?.map((tag) => (
                    <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} />
                  ))}
                </Detail.Metadata.TagList>
              )}
            </Detail.Metadata>
          }
        />
      }
    />
  );
};
