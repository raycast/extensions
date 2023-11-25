import { useEffect, useState } from "react";
import { formatTimerRuntime } from "../../lib/dateUtils";
import { parseISO } from "date-fns";
import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { TimeSpan } from "@zeitraum/client";
import { confirmTimeSpanDeletion, stopTimer, updateTimeSpan } from "../../lib/zeitraumClient";
import { TimeSpanEditForm } from "./timeSpanEditForm";

export const TimeSpanListItem = ({ timeSpan, allowStop = false }: { timeSpan: TimeSpan; allowStop?: boolean }) => {
  const { push } = useNavigation();
  const hasTags = timeSpan.tags?.length !== undefined && timeSpan.tags.length > 0;
  const title = timeSpan.tags?.map((tag) => tag.name)?.join(", ");
  const [distance, setDistance] = useState(
    formatTimerRuntime(parseISO(timeSpan.start), timeSpan.end ? parseISO(timeSpan.end) : undefined)
  );

  const onEdit = () =>
    push(<TimeSpanEditForm timeSpan={timeSpan} onSubmit={(values) => updateTimeSpan(timeSpan.id, values)} />);

  useEffect(() => {
    if (timeSpan.end) {
      return;
    }
    const interval = setInterval(() => {
      setDistance(formatTimerRuntime(parseISO(timeSpan.start)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <List.Item
      title={timeSpan.note ? timeSpan.note : hasTags && title ? title : "Unnamed Timer"}
      subtitle={distance}
      icon={Icon.Stopwatch}
      actions={
        <ActionPanel>
          {allowStop && <Action title="Stop" onAction={() => stopTimer(timeSpan.id)} icon={Icon.Stop} />}
          <Action title="Edit" onAction={onEdit} icon={Icon.Pencil} />
          <Action
            style={Action.Style.Destructive}
            title="Delete"
            onAction={() => confirmTimeSpanDeletion(timeSpan.id)}
            icon={Icon.Trash}
            shortcut={{ key: "backspace", modifiers: ["cmd"] }}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={`# ${distance}`}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Started at"
                text={parseISO(timeSpan.start).toLocaleString()}
                icon={Icon.Clock}
              />
              {timeSpan.end && (
                <Detail.Metadata.Label
                  title="Stopped at"
                  text={parseISO(timeSpan.end).toLocaleString()}
                  icon={Icon.Clock}
                />
              )}
              {timeSpan.note && <Detail.Metadata.Label title="Note" text={timeSpan.note} icon={Icon.Bubble} />}
              {hasTags && (
                <Detail.Metadata.TagList title="Tags">
                  {timeSpan.tags?.map((tag) => (
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
