import { useFetch } from "@raycast/utils";
import { API_KEY, BASE_URL, DEFAULT_LIMIT } from "./utils/constants";
import { Action, ActionPanel, Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import { ErrorResponse, GetPostalCodesByStateResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

export default function GetPostalCodesByState(
  props: LaunchProps<{ arguments: Arguments.GetPostalCodesByState }>
) {
  const { push } = useNavigation();
  const { state_name, country, limit } = props.arguments;

  const params = new URLSearchParams({ apikey: API_KEY, state_name, country, limit: limit || DEFAULT_LIMIT });
  
  const { isLoading, data, revalidate } = useFetch<ErrorResponse | GetPostalCodesByStateResponse>(
    `${BASE_URL}code/state?` + params
  );

  return (data && ("error" in data)) ? push(<ErrorComponent error={data.error} />) : (
    <List isLoading={isLoading}>
      {data && !("error" in data) && Object.keys(data.results).length>0 ? (
          <List.Section title={`state: ${data.query.state} | country: ${data.query.country}`}>
            {data.results.map(result => (
                <List.Item
                  key={result}
                  title={result}
                  icon={Icon.Pin}
                  actions={<ActionPanel>
                    <Action.CopyToClipboard content={result} />
                    <Action.CopyToClipboard title="Copy All to Clipboard" content={data.results.join()} />
                    <ActionPanel.Section>
                      <Action title="Revalidate" icon={Icon.Redo} onAction={revalidate} />
                    </ActionPanel.Section>
                  </ActionPanel>}
                />
              ))}
          </List.Section>
          ) : <List.EmptyView title="No Results" description={`state: ${state_name} | country: ${country}`} />}
    </List>
  );
}
