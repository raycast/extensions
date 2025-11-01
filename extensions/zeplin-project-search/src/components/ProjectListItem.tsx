import { ActionPanel, List, Application, getApplications, Icon, Action, Keyboard, Color } from "@raycast/api";
import { ProjectStatus, type Project } from "../types";
import { useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { formatDistanceToNow } from "date-fns";

export default function ProjectListItem(props: {
  project: Project;
  onVisit: (project: Project) => void;
  onLeave: (project: Project) => void;
  removeFromVisits?: (project: Project) => void;
}) {
  const [isShowingDetail, setIsShowingDetail] = useCachedState<boolean>("show-project-details");
  const { project, onVisit, onLeave, removeFromVisits } = props;
  const [desktopApp, setDesktopApp] = useState<Application>();

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((a) => a.bundleId === "io.zeplin.osx"))
      .then(setDesktopApp);
  }, []);

  return (
    <List.Item
      id={project.id}
      title={project.name}
      icon={project.organization?.logo || Icon.Dot}
      subtitle={isShowingDetail ? "" : project.platform}
      actions={
        <ActionPanel>
          {desktopApp ? (
            <Action.Open
              title="Open in Zeplin App"
              icon={Icon.Document}
              target={`zpl://project?pid=${project.id}`}
              application={desktopApp}
              onOpen={() => onVisit(project)}
            />
          ) : null}
          <Action.OpenInBrowser
            title={`Open in Browser`}
            url={`https://app.zeplin.io/project/${project.id}`}
            onOpen={() => onVisit(project)}
          />
          <Action.CopyToClipboard
            title="Copy URL to Clipboard"
            icon={Icon.Clipboard}
            content={`https://app.zeplin.io/project/${project.id}`}
          />
          {removeFromVisits ? (
            <Action
              icon={Icon.Trash}
              title="Remove from Recently Visited Projects"
              onAction={() => removeFromVisits(project)}
            />
          ) : null}
          <Action
            icon={Icon.ExclamationMark}
            title="Leave Project"
            onAction={() => onLeave(project)}
            style={Action.Style.Destructive}
          />
          <Action
            icon={Icon.AppWindowSidebarLeft}
            title="Toggle Details"
            onAction={() => setIsShowingDetail((prev) => !prev)}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
          />
        </ActionPanel>
      }
      accessories={
        isShowingDetail
          ? undefined
          : [
              {
                tag: {
                  value: project.status,
                  color: project.status === ProjectStatus.Active ? Color.Green : Color.Yellow,
                },
              },
              {
                text: formatDistanceToNow(project.updated * 1000),
              },
            ]
      }
      detail={
        <List.Item.Detail
          markdown={`![Thumbnail](${project.thumbnail})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Members" text={project.number_of_members.toString()} />
              <List.Item.Detail.Metadata.Label title="Screens" text={project.number_of_screens.toString()} />
              <List.Item.Detail.Metadata.Label title="Components" text={project.number_of_components.toString()} />
              <List.Item.Detail.Metadata.Label
                title="Connected Components"
                text={project.number_of_connected_components.toString()}
              />
              <List.Item.Detail.Metadata.Label title="Text Styles" text={project.number_of_text_styles.toString()} />
              <List.Item.Detail.Metadata.Label title="Colors" text={project.number_of_colors.toString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
