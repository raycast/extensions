import { List, open, closeMainWindow, PopToRootType } from "@raycast/api";
import { useEffect, useRef } from "react";
import { deployProject } from "../utils/deploy";

interface DeployingProps {
  deployProjectPath: string;
}

export default function Deploying({ deployProjectPath }: DeployingProps) {
  const hasLogged = useRef(false);

  useEffect(() => {
    async function deploy() {
      if (!hasLogged.current) {
        hasLogged.current = true;
        const uploadURL = await deployProject(deployProjectPath);
        open(uploadURL);
        await closeMainWindow({ popToRootType: PopToRootType.Immediate, clearRootSearch: true });
      }
    }

    deploy();
  }, []);

  return (
    <List>
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
