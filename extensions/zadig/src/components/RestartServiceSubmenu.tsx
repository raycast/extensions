import { Action, ActionPanel, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getEnvironmentServices, restartService, type Environment } from "../api/environments";

type RestartServiceSubmenuProps = {
  projectKey: string;
  environment: Environment;
};

export default function RestartServiceSubmenu({ projectKey, environment }: RestartServiceSubmenuProps) {
  const [hasOpened, setHasOpened] = useState(false);
  const { data: services, isLoading } = useCachedPromise(
    getEnvironmentServices,
    [projectKey, environment.env_key, environment.production],
    { execute: hasOpened },
  );

  async function confirmRestart(serviceName: string) {
    const isConfirmed = await confirmAlert({
      title: `Restart ${serviceName}?`,
      message: environment.production
        ? `This restarts ${serviceName} in the production environment ${environment.env_key}.`
        : `This replaces every pod of ${serviceName} in ${environment.env_key}.`,
      primaryAction: { title: "Restart", style: Alert.ActionStyle.Destructive },
    });

    if (!isConfirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Restarting ${serviceName}` });

    try {
      await restartService(projectKey, environment, serviceName);
      toast.style = Toast.Style.Success;
      toast.title = `Restarted ${serviceName}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to restart ${serviceName}`;
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <ActionPanel.Submenu
      title="Restart Service…"
      icon={Icon.RotateClockwise}
      isLoading={isLoading}
      onOpen={() => setHasOpened(true)}
    >
      {services?.map(({ serviceName }) => (
        <Action key={serviceName} title={serviceName} icon={Icon.Box} onAction={() => confirmRestart(serviceName)} />
      ))}
    </ActionPanel.Submenu>
  );
}
