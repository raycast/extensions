import { Action, ActionPanel, Icon, LaunchProps, List, showToast } from "@raycast/api";
import { ErrorResponse, GetPostalCodeDistanceResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { useEffect, useState } from "react";
import { getPostalCodeDistance } from "./utils/api";

export default function GetPostalCodeDistance(props: LaunchProps<{ arguments: Arguments.GetPostalCodeDistance }>) {
  const { code, compare, country } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ErrorResponse | GetPostalCodeDistanceResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getPostalCodeDistance(code, compare, country);
    if ("results" in response) {
      showToast({
        title: "SUCCESS",
        message: `Fetched ${Object.keys(response.results).length} distance results`,
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
        <List.Section title={`code: ${code} | country: ${country}`}>
          {Object.entries(data.results).map(([compare, distance]) => (
            <List.Item
              key={compare}
              title={`${code} - ${compare}`}
              icon={Icon.Map}
              accessories={[{ text: distance.toString() + data.query.unit }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Distance" content={distance.toString() + data.query.unit} />
                  <ActionPanel.Section>
                    <Action title="Revalidate" icon={Icon.Redo} onAction={getFromApi} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No Results" description={`code: ${code} | compare: ${compare} | country: ${country}`} />
      )}
    </List>
  );
}
