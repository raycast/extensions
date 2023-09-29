import { useFetch } from "@raycast/utils";
import { API_KEY, BASE_URL, DEFAULT_UNIT } from "./utils/constants";
import { Action, ActionPanel, Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import { ErrorResponse, GetPostalCodesWithinDistanceResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

export default function GetPostalCodesWithinDistance(
  props: LaunchProps<{ arguments: Arguments.GetPostalCodesWithinDistance }>
) {
  const { push } = useNavigation();
  const { codes, distance, country } = props.arguments;

  const params = new URLSearchParams({ apikey: API_KEY, codes, distance, country });
  
  const { isLoading, data, revalidate } = useFetch<ErrorResponse | GetPostalCodesWithinDistanceResponse>(
    `${BASE_URL}match?` + params
  );

  return (data && ("error" in data)) ? push(<ErrorComponent error={data.error} />) : (
    <List isLoading={isLoading}>
        {data && !("error" in data) && Object.keys(data.results).length>0 ? <List.Section title={`codes: ${codes} | distance: ${distance}${DEFAULT_UNIT} | country: ${country}`}>
              {data.results.map((result) => (
                <List.Item
                  key={result.code_1 + result.code_2}
                  title={`${result.code_1} - ${result.code_2}`}
                  icon={Icon.Compass}
                  accessories={[
                    { text: `distance: ${result.distance}${DEFAULT_UNIT}` }
                  ]}
                  actions={<ActionPanel>
                    <Action.CopyToClipboard title="Copy as JSON" content={JSON.stringify(result)} />
                    <ActionPanel.Section>
                      <Action title="Revalidate" icon={Icon.Redo} onAction={revalidate} />
                    </ActionPanel.Section>
                  </ActionPanel>}
                />
              ))}
          </List.Section> : <List.EmptyView title="No Results" description={`codes: ${codes} | distance: ${distance} | country: ${country}`} />}
    </List>
  );
}
