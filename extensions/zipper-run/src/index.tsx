import { Form, ActionPanel, Action, LaunchProps, Detail, useNavigation, List } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { BootInfo, BootInfoResult, InputParams } from "./types/boot-info";

type Values = {
  textfield: string;
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
};

interface AppletArguments {
  appletName: string;
  scriptName?: string;
}

interface AppResultsProps {
  appResults: Record<string, object | string | []> | string;
}

interface Description {
  title: string;
  body: string;
}

interface InputDescription {
  description: string;
  label: string;
}

interface ScriptConfig {
  description?: Description;
  inputs?: { [inputName: string]: InputDescription };
}

interface AppletConfigs {
  configs: { [scriptName: string]: ScriptConfig };
}

export default function Command(props: LaunchProps<{ arguments: AppletArguments }>) {
  const { scriptName, appletName } = props.arguments;
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function init() {
      if (scriptName) {
        setIsLoading(true);

        const body = JSON.stringify({ filename: scriptName });
        const data = await fetch(`https://zipper.dev/api/bootInfo/${appletName}`, {
          method: "POST",
          body,
        });

        const inputsJson = (await data.json()) as BootInfoResult;

        const configRequest = await fetchConfig({ appletName, filename: scriptName });
        const configJson = (await configRequest.json()) as AppletConfigs;

        if (inputsJson.ok && inputsJson.data.inputs.length > 0) {
          push(
            <InputsForm
              appletData={inputsJson.data}
              appletConfig={configJson}
              inputs={inputsJson.data.inputs}
              scriptName={scriptName}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />,
          );
          setIsLoading(false);
          return;
        }

        // no inputs, need to run the applet
        const appRun = await runApplet({ appletName, scriptName, appletUrlArguments: "" });
        const appJson = (await appRun.json()) as Record<string, string>;

        if (appJson.ok) {
          push(<AppResults appResults={appJson.data} isLoading={isLoading} />);
          setIsLoading(false);
        }
      }
    }
    init();
  }, []);

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
    // return renderMarkdown((await response.json()) as AppResult);
  }

  async function fetchConfig({ appletName, filename }: { appletName: string; filename: string }) {
    const response = await fetch(`https://${appletName}.zipper.run/boot`, {
      method: "POST",
      body: JSON.stringify({ filename }),
    });

    return response;
  }

  async function handleSubmit(values: Values) {
    const appletUrlArguments = Object.keys(values)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(values[key as keyof Values]))}`)
      .join("&");

    const response = await runApplet({
      appletName,
      scriptName,
      appletUrlArguments,
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = (await response.json()) as Record<string, string>;

    push(<AppResults appResults={data.data} isLoading={isLoading} />);
  }

  return null;
}

const InputsForm = ({
  appletData,
  appletConfig,
  inputs,
  scriptName,
  handleSubmit,
  isLoading,
}: {
  appletData: BootInfo;
  appletConfig: AppletConfigs | undefined;
  inputs: InputParams;
  scriptName: string;
  handleSubmit: (values: Values) => Promise<void>;
  isLoading: boolean;
}) => {
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Inputs"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Script name" text={scriptName} />

      {appletConfig?.configs[scriptName].description ? (
        <Form.Description
          title={appletConfig?.configs[scriptName].description?.title ?? ""}
          text={appletConfig?.configs[scriptName].description?.body ?? ""}
        />
      ) : null}

      <Form.Description title={"Applet name"} text={appletData.app.name!} />
      <Form.Description
        title="Applet Inputs"
        text="These are the necessary inputs for running this applet. Fill them out and click submit to run the applet."
      />
      {inputs.map((input) => {
        const inputDescription = appletConfig?.configs[scriptName]?.inputs?.[input.key]?.description;
        const inputLabel = appletConfig?.configs[scriptName]?.inputs?.[input.key]?.label;

        switch (input.type) {
          case "string":
            return (
              <Form.TextField
                id={input.key}
                title={input.name ?? inputLabel ?? input.key}
                key={input.key}
                placeholder={input.description ?? input.description ?? inputDescription}
              />
            );
          case "date":
            return <Form.DatePicker id={input.key} title={input.name} key={input.key} />;
          case "boolean":
            return <Form.Checkbox id={input.key} label={input.name ? input.name : input.key} key={input.key} />;
          case "enum":
          default:
            return null;
        }
      })}
    </Form>
  );
};

const isImageUrl = (url: string): boolean => {
  return /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/.test(url);
};

const objectToMarkdown = (data: Record<string, string | object | []>): string => {
  return Object.entries(data)
    .map(([key, value]) => {
      if (typeof value === "string" && isImageUrl(value)) {
        return `<img src="${value}" alt="${key}" width="300" height="300" />`;
      }
      return `**${key}:** ${value}`;
    })
    .join("\n\n");
};

const generateListItems = (results: object | string | []) => {
  return Object.entries(results).map(([key, value]) => {
    if (key === "__meta") return null;

    let detail;
    if (typeof value === "object") {
      detail = <List.Item.Detail markdown={`\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``} />;
    } else {
      detail = <List.Item.Detail markdown={String(value)} />;
    }

    return <List.Item key={key} title={key} detail={detail} />;
  });
};

const AppResults = ({
  appResults,

  isLoading,
}: AppResultsProps & { isLoading: boolean }) => {
  const data = appResults; // Directly accessing the "data" field

  if (typeof data === "string") {
    return <Detail markdown={`### Applet Results \n${data}`} isLoading={isLoading} />;
  }

  // If content is an object, check if it's a simple object or an object of objects
  if (typeof data === "object" && !Array.isArray(data) && !Object.values(data).some((val) => typeof val === "object")) {
    // It's a simple object
    const markdown = objectToMarkdown(data);
    return <Detail markdown={markdown} isLoading={isLoading} />;
  } else if (typeof data === "object") {
    return (
      <List isShowingDetail isLoading={isLoading}>
        {generateListItems(data)}
      </List>
    );
  }

  // Handle any other unexpected data types
  return null;
};
