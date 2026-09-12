import { Action, ActionPanel, Icon, Image, LaunchProps, List, showToast } from "@raycast/api";
import { ErrorResponse, GetStatesByCountryResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { useEffect, useState } from "react";
import { getStatesByCountry } from "./utils/api";

export default function GetStatesByCountry(props: LaunchProps<{ arguments: Arguments.GetStatesByCountry }>) {
  const { country } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ErrorResponse | GetStatesByCountryResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getStatesByCountry(country);
    if ("results" in response) {
      showToast({
        title: "SUCCESS",
        message: `Fetched ${response.results.length} states in ${country}`,
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
        <List.Section title={`country: ${data.query.country}`}>
          {data.results.map((result) => (
            <List.Item
              key={result}
              title={result}
              icon={{ source: Icon.Map, mask: Image.Mask.Circle }}
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
        <List.EmptyView title="No Results" description={`country: ${country}`} />
      )}
    </List>
  );
}
