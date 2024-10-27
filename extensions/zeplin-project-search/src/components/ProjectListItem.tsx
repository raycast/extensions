import { ActionPanel, List, Application, getApplications, Icon, Action } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "../types";
import { useState, useEffect } from "react";

export default function ProjectListItem(props: {
  project: Project;
  onVisit: (project: Project) => void;
  onLeave: (project: Project) => void;
  removeFromVisits?: (project: Project) => void;
}) {
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
      subtitle={project.platform}
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
              title="Remove from Recenlty Visited Projects"
              onAction={() => removeFromVisits(project)}
            />
          ) : null}
          <Action icon={Icon.ExclamationMark} title="Leave Project" onAction={() => onLeave(project)} />
        </ActionPanel>
      }
      accessories={[
        {
          text: formatDistanceToNow(project.updated * 1000),
        },
      ]}
    />
  );
}
