import { Action, Icon } from "@raycast/api";
import { ActionTypeProps } from "../types";

export const ActionType = ({ title, url, icon, replaceTab }: ActionTypeProps) => {
  if (replaceTab) {
    const handleAction = () => {
      // runJSInYouTubeMusicTab("");
    };
    return <Action icon={icon} title={title} onAction={handleAction} />;
  }

  return <Action.OpenInBrowser icon={icon || Icon.Play} title={title} url={url} />;
};
