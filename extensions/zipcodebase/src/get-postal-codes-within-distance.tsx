import { DEFAULT_UNIT } from "./utils/constants";
import { Action, ActionPanel, Icon, LaunchProps, List, showToast } from "@raycast/api";
import { ErrorResponse, GetPostalCodesWithinDistanceResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { useEffect, useState } from "react";
import { getPostalCodesWithinDistance } from "./utils/api";

export default function GetPostalCodesWithinDistance(
  props: LaunchProps<{ arguments: Arguments.GetPostalCodesWithinDistance }>
) {
  const { codes, distance, country } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ErrorResponse | GetPostalCodesWithinDistanceResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getPostalCodesWithinDistance(codes, distance, country);
    if ("results" in response) {
      showToast({
        title: "SUCCESS",
        message: `Fetched ${Object.keys(response.results).length} results`,
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
        <List.Section title={`codes: ${codes} | distance: ${distance}${DEFAULT_UNIT} | country: ${country}`}>
          {data.results.map((result) => (
            <List.Item
              key={result.code_1 + result.code_2}
              title={`${result.code_1} - ${result.code_2}`}
              icon={Icon.Compass}
              accessories={[{ text: `distance: ${result.distance}${DEFAULT_UNIT}` }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy as JSON" content={JSON.stringify(result)} />
                  <ActionPanel.Section>
                    <Action title="Revalidate" icon={Icon.Redo} onAction={getFromApi} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          title="No Results"
          description={`codes: ${codes} | distance: ${distance} | country: ${country}`}
        />
      )}
    </List>
  );
}
