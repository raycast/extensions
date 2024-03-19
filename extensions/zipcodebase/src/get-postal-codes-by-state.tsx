import { Action, ActionPanel, Icon, LaunchProps, List, showToast } from "@raycast/api";
import { ErrorResponse, GetPostalCodesByStateResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { useEffect, useState } from "react";
import { getPostalCodesByState } from "./utils/api";

export default function GetPostalCodesByState(props: LaunchProps<{ arguments: Arguments.GetPostalCodesByState }>) {
  const { state_name, country } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ErrorResponse | GetPostalCodesByStateResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getPostalCodesByState(state_name, country);
    if ("results" in response) {
      showToast({
        title: "SUCCESS",
        message: `Fetched ${Object.keys(response.results).length} codes`,
      });
    }
    setData(response);
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  return data && !("results" in data) ? (
    <ErrorComponent errorResponse={data} />
  ) : (
    <List isLoading={isLoading}>
      {data && Object.keys(data.results).length > 0 ? (
        <List.Section title={`state: ${data.query.state} | country: ${data.query.country}`}>
          {data.results.map((result) => (
            <List.Item
              key={result}
              title={result}
              icon={Icon.Pin}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={result} />
                  <Action.CopyToClipboard title="Copy All to Clipboard" content={data.results.join()} />
                  <ActionPanel.Section>
                    <Action title="Revalidate" icon={Icon.Redo} onAction={getFromApi} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No Results" description={`state: ${state_name} | country: ${country}`} />
      )}
    </List>
  );
}
