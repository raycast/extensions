import { useFetch } from "@raycast/utils";
import { API_KEY, BASE_URL, DEFAULT_LIMIT } from "./utils/constants";
import { Action, ActionPanel, Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import { ErrorResponse, GetPostalCodesByCityResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

export default function GetPostalCodesByCity(
  props: LaunchProps<{ arguments: Arguments.GetPostalCodesByCity }>
) {
  const { push } = useNavigation();
  const { city, country, limit } = props.arguments;

  const params = new URLSearchParams({ apikey: API_KEY, city, country, limit: limit || DEFAULT_LIMIT });
  
  const { isLoading, data, revalidate } = useFetch<ErrorResponse | GetPostalCodesByCityResponse>(
    `${BASE_URL}code/city?` + params
  );

  return (data && ("error" in data)) ? push(<ErrorComponent error={data.error} />) : (
    <List isLoading={isLoading}>
      {data && !("error" in data) && Object.keys(data.results).length>0 ? (
          <List.Section title={`city: ${data.query.city} | country: ${data.query.country}`}>
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
          ) : <List.EmptyView title="No Results" description={`city: ${city} | country: ${country}`} />}
    </List>
  );
}
