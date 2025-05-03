import { Action, ActionPanel, Icon, LaunchProps, List, showToast } from "@raycast/api";
import { ErrorResponse, GetPostalCodesByCityResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { useEffect, useState } from "react";
import { getPostalCodesByCity } from "./utils/api";

export default function GetPostalCodesByCity(props: LaunchProps<{ arguments: Arguments.GetPostalCodesByCity }>) {
  const { city, country, state_name } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ErrorResponse | GetPostalCodesByCityResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getPostalCodesByCity(city, country, state_name);
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
        <List.Section title={`city: ${data.query.city} | country: ${data.query.country} | state: ${data.query.state}`}>
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
        <List.EmptyView title="No Results" description={`city: ${city} | country: ${country} | state: ${state_name}`} />
      )}
    </List>
  );
}
