import { DEFAULT_UNIT } from "./utils/constants";
import { Action, ActionPanel, Icon, LaunchProps, List, showToast } from "@raycast/api";
import { ErrorResponse, GetPostalCodesWithinRadiusResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { useEffect, useState } from "react";
import { getPostalCodesWithinRadius } from "./utils/api";

export default function GetPostalCodesWithinRadius(
  props: LaunchProps<{ arguments: Arguments.GetPostalCodesWithinRadius }>
) {
  const { code, radius, country } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ErrorResponse | GetPostalCodesWithinRadiusResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getPostalCodesWithinRadius(code, radius, country);
    if ("results" in response) {
      showToast({
        title: "SUCCESS",
        message: `Fetched ${response.results.length} codes`,
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
    <List isLoading={isLoading} isShowingDetail>
      {data && Object.keys(data.results).length > 0 ? (
        <List.Section title={`code: ${code} | radius: ${radius}${DEFAULT_UNIT} | country: ${country}`}>
          {data.results.map((result, index) => (
            <List.Item
              key={index}
              title={result.code}
              icon={Icon.Compass}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Code" text={result.code} />
                      <List.Item.Detail.Metadata.Label title="City" text={result.city} />
                      <List.Item.Detail.Metadata.Label
                        title="State"
                        text={result.state || undefined}
                        icon={!result.state ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="City (en)"
                        text={result.city_en || undefined}
                        icon={!result.city_en ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="State (en)"
                        text={result.state_en || undefined}
                        icon={!result.state_en ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label title="Distance" text={result.distance.toString()} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
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
        <List.EmptyView title="No Results" description={`code: ${code} | radius: ${radius} | country: ${country}`} />
      )}
    </List>
  );
}
