import { ActionPanel, Action, LaunchProps, Detail, useNavigation, List } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { InputsForm } from "./components/InputsForm";
import { BootInfo, InputParams } from "./types/boot-info";

import type { Values } from "./api/types";
import { fetchBootInfo } from "./api";
import { AppResults } from "./components/AppResults";

interface AppletArguments {
  appletName: string;
  scriptName?: string;
}

export default function Command(props: LaunchProps<{ arguments: AppletArguments }>) {
  const { appletName } = props.arguments;
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScript, setSelectedScript] = useState<string>("");
  const [appletBootInfo, setAppletBootInfo] = useState<BootInfo | undefined>();
  const [appletInputs, setAppletInputs] = useState<InputParams>();

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    const appletUrlArguments = Object.keys(values)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(values[key as keyof Values]))}`)
      .join("&");

    const response = await runApplet({
      appletName,
      scriptName: selectedScript,
      appletUrlArguments,
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = (await response.json()) as Record<string, string>;

    push(<AppResults appResults={data.data} isLoading={isLoading} />);
    setIsLoading(false);
  }

  async function runApplet({
    appletName,
    scriptName,
    appletUrlArguments,
  }: {
    appletName: string;
    scriptName?: string;
    appletUrlArguments: string;
  }) {
    const response = await fetch(
      `https://${appletName}.zipper.run/${scriptName || "main.ts"}/api?${appletUrlArguments}`,
      {
        method: "GET",
      },
    );

    return response;
  }

  useEffect(() => {
    async function boot() {
      setIsLoading(true);
      const bootInfo = await fetchBootInfo(appletName);
      if (bootInfo && bootInfo.ok) {
        setAppletBootInfo(bootInfo.data);
        // Automatically select main.ts if it's the only script
        if (bootInfo.data.runnableScripts.length === 1 && bootInfo.data.runnableScripts[0] === "main.ts") {
          setAppletInputs(bootInfo.data.inputs);
          // getConfig(bootInfo.data);
        }
      }
      setIsLoading(false);
    }
    boot();
  }, [appletName]);

  useEffect(() => {
    async function fetchInputs() {
      if (selectedScript) {
        const bootInfo = await fetchBootInfo(appletName, selectedScript);
        if (bootInfo && bootInfo.ok) {
          setAppletInputs(bootInfo.data.inputs);
        }
      }
    }
    fetchInputs();
  }, [selectedScript]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if ((selectedScript && appletInputs) || (appletBootInfo?.runnableScripts.length === 1 && appletInputs)) {
    return (
      <InputsForm
        appletData={appletBootInfo!}
        inputs={appletInputs}
        scriptName={selectedScript}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    );
  }

  if (appletBootInfo && appletBootInfo.runnableScripts.length > 1) {
    // Prioritize main.ts without mutating the original array
    const runnableScripts = ["main.ts", ...appletBootInfo.runnableScripts.filter((script) => script !== "main.ts")];
    return (
      <List navigationTitle="Scripts available">
        {runnableScripts.map((script) => (
          <List.Item
            key={script}
            title={script}
            actions={
              <ActionPanel>
                <Action title="Select" onAction={() => setSelectedScript(script)} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
}
