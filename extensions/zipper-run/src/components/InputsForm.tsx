import { useEffect, useMemo, useState } from "react";
import { Form, ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { fetchConfig } from "../api";
import { BootInfo, AppletConfigs, Values } from "../api/types";
import { InputParams } from "../types/boot-info";

interface InputsFormProps {
  appletData: BootInfo;
  inputs: InputParams;
  scriptName: string;
  handleSubmit: (values: Values) => Promise<void>;
  isLoading: boolean;
}

export const InputsForm = ({ appletData, inputs, scriptName, handleSubmit, isLoading }: InputsFormProps) => {
  const [appletConfig, setAppletConfig] = useState<AppletConfigs | undefined>();
  const [configIsLoading, setConfigIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAndSetConfig() {
      setConfigIsLoading(true);
      try {
        const response = await fetchConfig({
          appletName: appletData.app.slug,
          filename: scriptName,
        });

        if (response) {
          setAppletConfig(response);
        }
      } catch (error) {
        console.error("Failed to fetch config:", error);
      } finally {
        setConfigIsLoading(false);
      }
    }

    fetchAndSetConfig();
  }, [appletData.app.slug, scriptName]); // Depend on appletData and scriptName for re-fetching when they change

  // Memoized form elements to prevent unnecessary re-renders
  const inputElements = useMemo(() => {
    return inputs.map((input) => {
      const inputConfig = appletConfig?.configs[scriptName]?.inputs?.[input.key];
      const inputDescription = inputConfig?.description ?? input.description ?? "";
      const inputLabel = inputConfig?.label ?? input.name ?? input.key;

      switch (input.type) {
        case "string":
        case "any":
        case "unknown":
          return <Form.TextField id={input.key} title={inputLabel} key={input.key} placeholder={inputDescription} />;
        case "date":
          return <Form.DatePicker id={input.key} title={inputLabel} key={input.key} />;
        case "boolean":
          return <Form.Checkbox id={input.key} label={inputLabel} key={input.key} />;
        case "enum":
          return (
            <Form.Dropdown id={input.key} title={inputLabel} key={input.key}>
              {input.details &&
                Array.isArray(input.details.values) &&
                input.details.values.map((value: string | { key: string; value: string }) => renderDropdownItem(value))}
            </Form.Dropdown>
          );
        default:
          return null;
      }
    });
  }, [inputs, appletConfig, scriptName]); // Re-memoize when inputs, appletConfig, or scriptName change

  if (configIsLoading || isLoading) {
    // Show a loading indicator while the config is being fetched
    return <Detail isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Inputs"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Script name" text={scriptName || appletData.runnableScripts[0]} />

      {appletConfig?.configs[scriptName]?.description ? (
        <Form.Description
          title={appletConfig.configs[scriptName].description?.title ?? ""}
          text={appletConfig.configs[scriptName].description?.body ?? ""}
        />
      ) : null}

      <Form.Description title={"Applet name"} text={appletData.app.name ?? appletData.app.slug} />
      <Form.Description
        title="Applet Inputs"
        text="These are the necessary inputs for running this applet. Fill them out and click submit to run the applet."
      />
      {inputElements}
    </Form>
  );
};

const renderDropdownItem = (value: string | { key: string; value: string }) => {
  if (typeof value === "string") {
    return <Form.Dropdown.Item key={value} title={value} value={value} />;
  }

  return <Form.Dropdown.Item key={value.key} title={value.value} value={value.value} />;
};
