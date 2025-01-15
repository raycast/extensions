import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { deployProject } from "../utils/deploy";

interface DeployingProps {
  deployProjectPath: string;
}

export default function Deploying({ deployProjectPath }: DeployingProps) {
  const [deployResult, setDeployResult] = useState<string>("");
  const hasLogged = useRef(false);

  useEffect(() => {
    async function deploy() {
      if (!hasLogged.current) {
        hasLogged.current = true;
        const result = await deployProject(deployProjectPath);
        setDeployResult(result);
      }
    }

    deploy();
  }, []);

  return (
    <List
      actions={
        <ActionPanel>
          {deployResult.length > 0 && (
            <Action.OpenInBrowser title="Open Dashboard" url={deployResult} icon={Icon.AppWindow} />
          )}
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={{
          source: {
            light: "zeabur-light.svg",
            dark: "zeabur-dark.svg",
          },
        }}
        title="Deploying"
        description="Your project is being deployed to Zeabur. This may take a few minutes."
      />
    </List>
  );
}
